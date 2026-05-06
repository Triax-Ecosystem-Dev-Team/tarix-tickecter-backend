const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

// @desc    Get all trips (with pagination, search, filter)
// @route   GET /api/trips
// @access  Public
const getTrips = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      departureTerminal,
      arrivalTerminal,
      date,
      passengers,
    } = req.query;

    // [FIXED 1]: The Prisma String Trap
    // Explicitly cast page and limit to integers to prevent Prisma from crashing.
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter query
    const where = {};

    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    // [FIXED 2]: The Null Filter Trap
    // Ensure date, departureTerminal, and arrivalTerminal are completely omitted if they are empty strings.
    if (date && String(date).trim() !== '') {
      // Filter by the specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      if (startOfDay < todayStart) {
        // If the requested date is in the past, return early with an empty result
        return sendResponse(res, 200, {
          data: [],
          meta: { totalPages: 0, currentPage: pageNumber, totalCount: 0 },
        }, 'Trips fetched successfully');
      }

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.departureDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      // Default: ensure we only query trips from today onwards
      where.departureDate = {
        gte: todayStart,
      };
    }

    if (departureTerminal && departureTerminal.trim() !== '') {
      where.departureTerminal = { contains: departureTerminal.trim(), mode: 'insensitive' };
    }
    if (arrivalTerminal && arrivalTerminal.trim() !== '') {
      where.arrivalTerminal = { contains: arrivalTerminal.trim(), mode: 'insensitive' };
    }
    if (passengers) {
      where.availableSeats = { gte: parseInt(passengers) };
    }

    const [trips, totalCount] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { departureDate: 'asc' },
        include: {
          bus: {
            include: { busModel: true }
          },
          driver: true,
          busModel: true,
          bookings: {
            where: {
              status: { not: 'cancelled' }
            },
            select: { bookedSeats: true }
          },
          _count: {
            select: { bookings: true }
          }
        }
      }),
      prisma.trip.count({ where }),
    ]);

    // Extract valid occupied seats and flatten them into string[]
    const tripsWithOccupiedSeats = trips.map(trip => {
      const occupiedSeats = trip.bookings?.flatMap(b => b.bookedSeats || []) || [];
      const { bookings, ...rest } = trip;
      return { ...rest, occupiedSeats };
    });

    // Advanced Time-of-Day Filtering
    // Filter out trips that have already departed earlier today
    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    
    const validTrips = tripsWithOccupiedSeats.filter(trip => {
      const tripDate = new Date(trip.departureDate);
      const isToday = tripDate.getFullYear() === today.getFullYear() && 
                      tripDate.getMonth() === today.getMonth() && 
                      tripDate.getDate() === today.getDate();
      
      // If the trip is on a future date, it is valid
      if (!isToday) return true;
      
      // If the trip is today, parse the departureTime string (e.g., "08:00 AM")
      const timeMatch = trip.departureTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return true; // Fallback if format is unexpected
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const tripMinutes = hours * 60 + minutes;
      
      // Keep the trip only if its departure time is in the future
      return tripMinutes > currentMinutes;
    });

    sendResponse(res, 200, {
      data: validTrips,
      meta: {
        totalPages: Math.ceil(validTrips.length / limitNumber),
        currentPage: pageNumber,
        totalCount: validTrips.length,  // Reflects post-time-filter count, not raw DB count
      },
    }, 'Trips fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get trip by ID
// @route   GET /api/trips/:id
// @access  Public
const getTripById = async (req, res, next) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        bus: {
          include: { busModel: true }
        },
        busModel: true,
        driver: true,
        bookings: {
          include: {
            passenger: true
          }
        }
      }
    });

    if (trip) {
      // Filter out cancelled bookings to compute actual occupied seats
      const validBookings = trip.bookings?.filter(b => b.status !== 'cancelled') || [];
      const occupiedSeats = validBookings.flatMap(b => b.bookedSeats || []);
      const tripWithOccupiedSeats = { ...trip, occupiedSeats };

      sendResponse(res, 200, tripWithOccupiedSeats, 'Trip fetched successfully');
    } else {
      sendResponse(res, 404, null, 'Trip not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private/Admin
const createTrip = async (req, res, next) => {
  try {
    const {
      departureDate,
      departureTime,
      departureTerminal,
      arrivalTerminal,
      availableSeats,
      price,
      busId,
      driverId,
    } = req.body;

    // [STEP 2]: Auto-Map the Bus Model
    // Derive busModelId from the selected bus for pricing inheritance.
    let derivedBusModelId = null;
    if (busId) {
      const bus = await prisma.bus.findUnique({ where: { id: busId } });
      derivedBusModelId = bus ? bus.busModelId : null;
    }

    const trip = await prisma.trip.create({
      data: {
        departureDate: new Date(departureDate),
        departureTime,
        departureTerminal,
        arrivalTerminal,
        // [STEP 3]: Ensure Clean Payload Types with fallback logic
        availableSeats: parseInt(availableSeats, 10) || 0,
        price: parseFloat(price) || 0,
        busId: busId || null,
        driverId: driverId || null,
        busModelId: derivedBusModelId,
      },
      include: {
        busModel: true,
      },
    });

    sendResponse(res, 201, trip, 'Trip created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update a trip
// @route   PUT /api/trips/:id
// @access  Private/Admin
const updateTrip = async (req, res, next) => {
  try {
    const tripExists = await prisma.trip.findUnique({
      where: { id: req.params.id },
    });

    if (!tripExists) {
      return sendResponse(res, 404, null, 'Trip not found');
    }

    const { departureDate, ...rest } = req.body;
    const dataToUpdate = { ...rest };
    if (departureDate) {
      dataToUpdate.departureDate = new Date(departureDate);
    }

    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });

    sendResponse(res, 200, trip, 'Trip updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a trip
// @route   DELETE /api/trips/:id
// @access  Private/Admin
const deleteTrip = async (req, res, next) => {
  try {
    const tripExists = await prisma.trip.findUnique({
      where: { id: req.params.id },
    });

    if (!tripExists) {
      return sendResponse(res, 404, null, 'Trip not found');
    }

    await prisma.trip.delete({
      where: { id: req.params.id },
    });

    sendResponse(res, 200, null, 'Trip deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Reassign bus for a trip
// @route   PATCH /api/trips/:id/reassign-bus
// @access  Private/Admin
const reassignBus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newBusId, newStatusForOldBus } = req.body;

    // 1. Get current trip and bus
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { bus: true }
    });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const oldBusId = trip.busId;

    // 2. Perform atomic transaction
    await prisma.$transaction(async (tx) => {
      // Update trip with new bus
      await tx.trip.update({
        where: { id },
        data: { busId: newBusId }
      });

      // Update old bus status if requested
      if (oldBusId && newStatusForOldBus) {
        let maintenanceStatus = 'Excellent';
        if (newStatusForOldBus === 'Maintenance') maintenanceStatus = 'Poor';
        
        await tx.bus.update({
          where: { id: oldBusId },
          data: { maintenanceStatus }
        });
      }
    });

    res.status(200).json({ 
      message: `Trip successfully moved to new bus. Old bus is now set to ${newStatusForOldBus}.` 
    });
  } catch (error) {
    console.error('Reassignment error:', error);
    res.status(500).json({ message: 'Failed to reassign trip', error: error.message });
  }
};

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  reassignBus,
};
