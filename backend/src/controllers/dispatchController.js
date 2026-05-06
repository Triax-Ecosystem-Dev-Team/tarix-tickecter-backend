const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

// @desc    Get today's fleet status
// @route   GET /api/dispatch/status
// @access  Private (Ticketer/Admin)
const getFleetStatus = async (req, res, next) => {
  try {
    const { date } = req.query;
    
    // Lagos is WAT = UTC+1 (no DST). Offset in milliseconds:
    const LAGOS_OFFSET_MS = 1 * 60 * 60 * 1000;

    // Parse the incoming date string (YYYY-MM-DD) or default to today in Lagos time
    let dateStr = date && String(date).trim() !== '' ? String(date).trim() : null;

    if (!dateStr) {
      // Get today's date in Lagos timezone
      const nowUTC = new Date();
      const nowLagos = new Date(nowUTC.getTime() + LAGOS_OFFSET_MS);
      dateStr = nowLagos.toISOString().slice(0, 10);
    }

    // dateStr is now guaranteed to be YYYY-MM-DD representing a day in Lagos
    // Build startOfDay as UTC equivalent of midnight in Lagos
    // e.g. "2026-05-01" in Lagos = 2026-05-01T00:00:00+01:00 = 2026-04-30T23:00:00Z
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - LAGOS_OFFSET_MS);
    const endOfDay   = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Diagnostic logging so we can verify the boundaries in the terminal
    console.log(`[Dispatch] Date requested: "${dateStr}"`);
    console.log(`[Dispatch] startOfDay (UTC): ${startOfDay.toISOString()}`);
    console.log(`[Dispatch]   endOfDay (UTC): ${endOfDay.toISOString()}`);

    // Reference point for status heuristic — current time in Lagos
    const nowUTC = new Date();
    const nowLagos = new Date(nowUTC.getTime() + LAGOS_OFFSET_MS);
    const currentMinutes = nowLagos.getUTCHours() * 60 + nowLagos.getUTCMinutes();

    const trips = await prisma.trip.findMany({
      where: {
        departureDate: {
          gte: startOfDay,
          lt: endOfDay,
        }
      },
      include: {
        bus: {
          include: { busModel: true }
        },
        driver: true,
        busModel: true,
        bookings: {
          where: { status: { not: 'cancelled' } },
          select: { seats: true }
        }
      },
      orderBy: { departureTime: 'asc' }
    });

    const formattedBuses = trips.map(trip => {
      // Calculate passengers
      const passengersBooked = trip.bookings.reduce((sum, b) => sum + b.seats, 0);
      const totalSeats = trip.bus?.totalCapacity || trip.busModel?.seatCapacity || 0; 

      // Reference point for status heuristic — current time in Lagos
      const nowUTC = new Date();
      const nowLagos = new Date(nowUTC.getTime() + LAGOS_OFFSET_MS);
      const todayStr = nowLagos.toISOString().slice(0, 10);
      const isFuture = dateStr > todayStr;

      // Determine Status
      let status = 'Scheduled';
      
      if (!isFuture) {
        const timeMatch = trip.departureTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

          if (modifier === 'PM' && hours < 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;

          const tripMinutes = hours * 60 + minutes;
          const currentMinutes = nowLagos.getUTCHours() * 60 + nowLagos.getUTCMinutes();
          
          // Assuming 4 hour journey for "Completed" heuristic if actualArrival is missing
          const arrivalMinutes = tripMinutes + 240; 

          if (currentMinutes > arrivalMinutes) {
             status = 'Completed'; 
          } else if (currentMinutes > tripMinutes) {
             status = 'In Transit';
          } else {
             status = 'Active';
          }
        }
      }

      // Overwrite heuristic with explicit DB status if it's set to something important (e.g. Cancelled)
      if (trip.status === 'Cancelled' || trip.status === 'Scheduled') {
         status = trip.status;
      }

      // Origin / Destination parsing
      const originName = trip.departureTerminal.split(',')[0].trim();
      const destName = trip.arrivalTerminal.split(',')[0].trim();

      // Ensure driver is handled if missing
      const driverName = trip.driver?.fullName || 'Unassigned';
      
      // Dynamic Bus Naming Logic
      const busType = (trip.bus?.manufacturer && trip.bus?.model) ? 
                      `${trip.bus.manufacturer} ${trip.bus.model}` : 
                      (trip.bus?.nickname || trip.bus?.name || '');
      
      // Arrival Logic: Calculate Scheduled ETA if actualArrival is null
      let arrivalDisplay = trip.actualArrival;
      if (!arrivalDisplay) {
        try {
          // Robust parsing of departureTime (handles 10:00, 10:00 AM, etc)
          const timeParts = trip.departureTime.match(/(\d+):(\d+)/);
          if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            
            // Handle AM/PM if present
            if (trip.departureTime.toLowerCase().includes('pm') && hours < 12) hours += 12;
            if (trip.departureTime.toLowerCase().includes('am') && hours === 12) hours = 0;

            const depDate = new Date();
            depDate.setHours(hours, minutes, 0);
            const arrDate = new Date(depDate.getTime() + 4 * 60 * 60 * 1000); // 4h default
            arrivalDisplay = `${arrDate.getHours().toString().padStart(2, '0')}:${arrDate.getMinutes().toString().padStart(2, '0')} (ETA)`;
          } else {
            arrivalDisplay = 'Scheduled';
          }
        } catch (e) {
          arrivalDisplay = 'Scheduled';
        }
      }

      // We map to the BusStatus interface expected by the frontend
      return {
        id: trip.bus?.plateNumber || `TRIP-${trip.id.slice(0,6).toUpperCase()}`,
        status,
        origin: originName,
        destination: destName,
        originTerminal: trip.departureTerminal,
        destinationTerminal: trip.arrivalTerminal,
        departureTime: trip.departureTime,
        arrivalTime: arrivalDisplay, // Map actualArrival/ETA to arrivalTime for frontend
        busType,
        driver: driverName,
        seatsBooked: passengersBooked,
        totalSeats: totalSeats,
        passengersBooked: passengersBooked,
      };
    });

    sendResponse(res, 200, formattedBuses, 'Fleet status fetched successfully');
  } catch (error) {
    next(error);
  }
};
// @desc    Get passenger manifest for a specific trip
// @route   GET /api/dispatch/trips/:tripId/passengers
// @access  Private (Ticketer/Admin)
const getTripPassengers = async (req, res, next) => {
  try {
    const { tripId } = req.params;

    // tripId from the frontend is bus.id (plateNumber or TRIP-XXXXXX)
    // We need to resolve it to the actual Trip record
    let trip = null;

    if (tripId.startsWith('TRIP-')) {
      // Resolve from our generated ID format: TRIP-<first 6 chars of trip UUID uppercased>
      // We query all trips and match (safer than reconstructing the UUID)
      const trips = await prisma.trip.findMany({ select: { id: true } });
      const matched = trips.find(t => `TRIP-${t.id.slice(0, 6).toUpperCase()}` === tripId);
      if (matched) trip = { id: matched.id };
    } else {
      // It's a plate number — resolve via the Bus record
      const bus = await prisma.bus.findFirst({
        where: { plateNumber: tripId },
        include: {
          trips: {
            orderBy: { departureDate: 'desc' },
            take: 1,
            select: { id: true }
          }
        }
      });
      if (bus && bus.trips.length > 0) {
        trip = { id: bus.trips[0].id };
      }
    }

    if (!trip) {
      return sendResponse(res, 404, null, 'Trip not found for the given reference.');
    }

    // Fetch all confirmed bookings for this trip with passenger details
    const bookings = await prisma.booking.findMany({
      where: {
        tripId: trip.id,
        status: { not: 'cancelled' }
      },
      include: {
        passenger: {
          select: {
            loginId: true,
            surname: true,
            firstname: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Map to a clean passenger manifest format
    const passengers = bookings.map((booking, index) => ({
      id: booking.id,
      fullName: booking.passenger
        ? `${booking.passenger.firstname} ${booking.passenger.surname}`.trim()
        : 'Unknown Passenger',
      seatNumber: booking.bookedSeats?.length > 0 
        ? booking.bookedSeats.join(', ') 
        : 'Unassigned',
      phone: booking.passenger?.phone || 'N/A',
      userId: booking.passenger?.loginId || 'N/A',
    }));

    console.log(`[Dispatch] Passenger manifest for "${tripId}": ${passengers.length} passengers found.`);

    sendResponse(res, 200, passengers, 'Passenger manifest fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update trip status
// @route   PATCH /api/dispatch/trips/:tripId/status
// @access  Private (Ticketer/Admin)
const updateTripStatus = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const { status, actualArrival } = req.body;

    if (!status) {
      return sendResponse(res, 400, null, 'Status is required');
    }

    // Resolve tripId to actual Trip ID if it's a plate number or TRIP-XXXX
    let actualTripId = tripId;
    if (tripId.startsWith('TRIP-')) {
      const trips = await prisma.trip.findMany({ select: { id: true } });
      const matched = trips.find(t => `TRIP-${t.id.slice(0, 6).toUpperCase()}` === tripId);
      if (matched) actualTripId = matched.id;
    } else {
      const bus = await prisma.bus.findFirst({
        where: { plateNumber: tripId },
        include: { trips: { orderBy: { departureDate: 'desc' }, take: 1 } }
      });
      if (bus && bus.trips.length > 0) actualTripId = bus.trips[0].id;
    }

    const updateData = { status, updatedAt: new Date() };
    if (actualArrival) {
      updateData.actualArrival = actualArrival;
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: actualTripId },
      data: updateData
    });

    sendResponse(res, 200, updatedTrip, 'Trip status updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales stats for today
// @route   GET /api/dispatch/sales-stats
// @access  Private (Ticketer/Admin)
const getSalesStats = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stats = await prisma.booking.groupBy({
      by: ['paymentMethod'],
      where: {
        paymentStatus: 'completed',
        createdAt: { gte: startOfToday }
      },
      _sum: {
        totalPrice: true,
        seats: true
      },
      _count: {
        id: true
      }
    });

    const totalRevenue = stats.reduce((acc, curr) => acc + (curr._sum.totalPrice || 0), 0);
    const totalTickets = stats.reduce((acc, curr) => acc + (curr._sum.seats || 0), 0);

    const breakdown = {
      cash: { tickets: 0, revenue: 0 },
      transfer: { tickets: 0, revenue: 0 },
      card: { tickets: 0, revenue: 0 }
    };

    stats.forEach(stat => {
      const method = stat.paymentMethod?.toLowerCase();
      if (breakdown[method]) {
        breakdown[method].tickets = stat._sum.seats || 0;
        breakdown[method].revenue = stat._sum.totalPrice || 0;
      }
    });

    sendResponse(res, 200, {
      totalTickets,
      totalRevenue,
      breakdown
    }, 'Sales stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFleetStatus,
  getTripPassengers,
  updateTripStatus,
  getSalesStats
};
