const prisma = require('../config/db');
const bcrypt = require('bcrypt');

// Add a new Ticketer
exports.createTicketer = async (req, res) => {
  try {
    const {
      fullName, email, password, phone, idNumber, homeAddress,
      station, workShift, employmentDate, monthlySalary,
      emergencyContactName, emergencyContactPhone,
      nextOfKinName, nextOfKinPhone, nextOfKinRelationship, nextOfKinAddress
    } = req.body;

    // Default password if not provided
    const userPassword = password || 'tarix1234';
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    const profilePhotoUrl = req.file ? req.file.path : null;

    // Use transaction to create User and Ticketer profile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email,
          password: hashedPassword,
          role: 'Ticketer',
        }
      });

      const ticketer = await tx.ticketer.create({
        data: {
          userId: user.id,
          phone,
          idNumber,
          homeAddress,
          station,
          workShift,
          employmentDate: employmentDate ? new Date(employmentDate) : null,
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : null,
          nextOfKinName,
          nextOfKinPhone,
          nextOfKinRelationship,
          nextOfKinAddress,
          profilePhotoUrl,
        }
      });

      return { user, ticketer };
    });

    res.status(201).json({ message: 'Ticketer created successfully', data: result });
  } catch (error) {
    console.error('Error creating ticketer:', error);
    res.status(500).json({ message: 'Failed to create ticketer', error: error.message });
  }
};

// Add a new Driver (Standalone record)
exports.createDriver = async (req, res) => {
  try {
    const {
      fullName, email, phone, bloodGroup, homeAddress, licenseNumber,
      yearsOfExperience, licenseIssueDate, licenseExpiryDate, assignedBusId,
      employmentDate, monthlySalary, emergencyContactName, emergencyContactPhone
    } = req.body;

    const profilePhotoUrl = req.file ? req.file.path : null;

    const driver = await prisma.driver.create({
      data: {
        fullName,
        email,
        phone,
        bloodGroup,
        homeAddress,
        licenseNumber,
        yearsOfExperience: parseInt(yearsOfExperience),
        licenseIssueDate: new Date(licenseIssueDate),
        licenseExpiryDate: new Date(licenseExpiryDate),
        assignedBusId: assignedBusId || null,
        employmentDate: new Date(employmentDate),
        monthlySalary: parseFloat(monthlySalary),
        emergencyContactName,
        emergencyContactPhone,
        profilePhotoUrl,
      }
    });

    res.status(201).json({ message: 'Driver created successfully', driver });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Failed to create driver', error: error.message });
  }
};

// Get all staff (Ticketers)
exports.getStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['Ticketer', 'Admin'] } },
      include: { ticketer: true }
    });
    res.status(200).json({ staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Failed to fetch staff', error: error.message });
  }
};

// Get all drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: { assignedBus: true }
    });
    res.status(200).json({ drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

// Get Driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { assignedBus: true }
    });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.status(200).json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch driver', error: error.message });
  }
};

// Update Driver
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.profilePhotoUrl = req.file.path;
    }

    // Convert dates and numbers
    if (updateData.yearsOfExperience) updateData.yearsOfExperience = parseInt(updateData.yearsOfExperience);
    if (updateData.monthlySalary) updateData.monthlySalary = parseFloat(updateData.monthlySalary);
    if (updateData.licenseIssueDate) updateData.licenseIssueDate = new Date(updateData.licenseIssueDate);
    if (updateData.licenseExpiryDate) updateData.licenseExpiryDate = new Date(updateData.licenseExpiryDate);
    if (updateData.employmentDate) updateData.employmentDate = new Date(updateData.employmentDate);

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({ message: 'Driver updated successfully', data: driver });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ message: 'Failed to update driver', error: error.message });
  }
};

// Get Ticketer by ID
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    // ID could be User ID or Ticketer Profile ID. We assume it's the User ID for consistency.
    const staff = await prisma.user.findUnique({
      where: { id },
      include: { ticketer: true }
    });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff member', error: error.message });
  }
};

// Update Ticketer
exports.updateTicketer = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const {
      fullName, email, phone, idNumber, homeAddress,
      station, workShift, employmentDate, monthlySalary,
      emergencyContactName, emergencyContactPhone
    } = req.body;

    const profilePhotoUrl = req.file ? req.file.path : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          name: fullName,
          email,
        }
      });

      const ticketer = await tx.ticketer.update({
        where: { userId: id },
        data: {
          phone,
          idNumber,
          homeAddress,
          station,
          workShift,
          employmentDate: employmentDate ? new Date(employmentDate) : undefined,
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : undefined,
          profilePhotoUrl,
        }
      });

      return { user, ticketer };
    });

    res.status(200).json({ message: 'Ticketer updated successfully', data: result });
  } catch (error) {
    console.error('Error updating ticketer:', error);
    res.status(500).json({ message: 'Failed to update ticketer', error: error.message });
  }
};
// Get admin dashboard stats
exports.getStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalBuses, 
      availableBuses, 
      activeTrips, 
      completedToday,
      revenueTodayData,
      ticketsSoldData,
      driversTotal
    ] = await Promise.all([
      prisma.bus.count(),
      prisma.bus.count({ where: { maintenanceStatus: 'Good' } }),
      prisma.trip.count({ where: { status: 'Active' } }),
      prisma.trip.count({ where: { status: 'Completed', departureDate: { gte: startOfToday } } }),
      prisma.booking.aggregate({ where: { paymentStatus: 'completed', createdAt: { gte: startOfToday } }, _sum: { totalPrice: true } }),
      prisma.booking.aggregate({ where: { createdAt: { gte: startOfToday } }, _sum: { seats: true } }),
      prisma.driver.count()
    ]);

    const revenueToday = revenueTodayData._sum.totalPrice || 0;
    const ticketsSold = ticketsSoldData._sum.seats || 0;
    const inactiveBuses = totalBuses - availableBuses;
    const utilization = totalBuses > 0 ? Math.round((availableBuses / totalBuses) * 100) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        totalBuses,
        inactiveBuses,
        availableBuses,
        utilization,
        activeTrips,
        completedToday,
        completedChange: 12, // mockup for now
        revenueToday: `₦${revenueToday.toLocaleString()}`,
        revenueChange: 8, // mockup for now
        ticketsSold,
        driversActive: Math.floor(driversTotal * 0.8), // mockup for now
        driversTotal
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

// Get revenue trend for the last 7 days
exports.getRevenueTrend = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        paymentStatus: 'completed',
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        totalPrice: true,
        createdAt: true
      }
    });

    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      daysMap[dayName] = 0;
    }

    let totalRevenue = 0;
    bookings.forEach(b => {
      const dayName = new Date(b.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (daysMap[dayName] !== undefined) {
        daysMap[dayName] += b.totalPrice;
        totalRevenue += b.totalPrice;
      }
    });

    const days = Object.keys(daysMap).map(day => ({ day, value: daysMap[day] }));
    const averageDaily = totalRevenue / 7;

    res.status(200).json({
      success: true,
      data: {
        days,
        totalRevenue,
        totalChange: 12, // mockup
        averageDaily,
        averageChange: 5 // mockup
      }
    });
  } catch (error) {
    console.error('Error fetching revenue trend:', error);
    res.status(500).json({ message: 'Failed to fetch revenue trend', error: error.message });
  }
};

// Get active trips
exports.getActiveTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      where: { status: 'Active' },
      include: {
        driver: true,
        bus: true,
        _count: {
          select: { bookings: true }
        }
      },
      take: 10
    });

    const formattedTrips = trips.map(t => ({
      id: t.id,
      from: t.departureTerminal,
      to: t.arrivalTerminal,
      driver: t.driver?.fullName || 'Unassigned',
      initials: t.driver?.fullName ? t.driver.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A',
      bus: t.bus?.registrationNumber || 'Unassigned',
      passengers: t._count.bookings,
      capacity: t.availableSeats,
      eta: t.departureTime,
      status: t.status
    }));

    res.status(200).json({
      success: true,
      data: {
        total: formattedTrips.length,
        trips: formattedTrips
      }
    });
  } catch (error) {
    console.error('Error fetching active trips:', error);
    
    if (error.code === 'P2022') {
      return res.status(500).json({ 
        error: "System Configuration Error", 
        message: "The database schema is out of sync. Please contact the system administrator.", 
        devDetails: "Missing column. Run prisma migrate." 
      });
    }

    if (error.code === 'P1001') {
      return res.status(503).json({ 
        error: "Database Offline", 
        message: "Cannot connect to the main database server." 
      });
    }

    res.status(500).json({ 
      error: "Fetch Error",
      message: "Failed to fetch active trips. Please try again later.",
      devDetails: error.message 
    });
  }
};

// ── GET /api/admin/trips ──────────────────────────────────────────────────────
exports.getTrips = async (req, res) => {
  try {
    const { status, date, searchTerm } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.valueOf())) {
        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);
        where.departureDate = { gte: d, lt: nextDay };
      }
    }
    if (searchTerm) {
      where.OR = [
        { departureTerminal: { contains: searchTerm, mode: 'insensitive' } },
        { arrivalTerminal: { contains: searchTerm, mode: 'insensitive' } },
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { driver: { fullName: { contains: searchTerm, mode: 'insensitive' } } }
      ];
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        driver: true,
        bus: true,
        _count: { select: { bookings: true } }
      },
      orderBy: { departureDate: 'desc' }
    });

    const formatted = trips.map(t => ({
      id: t.id,
      from: t.departureTerminal,
      to: t.arrivalTerminal,
      driver: t.driver?.fullName || 'Unassigned',
      initials: t.driver?.fullName
        ? t.driver.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'N/A',
      bus: t.bus?.registrationNumber || 'Unassigned',
      passengers: t._count.bookings,
      capacity: t.availableSeats,
      eta: t.departureTime || null,
      status: t.status
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: 'Failed to fetch trips', error: error.message });
  }
};

// ── GET /api/admin/trips/:tripId ──────────────────────────────────────────────
exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        bus: true,
        bookings: {
          include: { passenger: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const grossRevenue = trip.bookings
      .filter(b => b.paymentStatus === 'completed')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const deductions = 0; // Configurable deductions if needed
    const netRevenue = grossRevenue - deductions;
    const driverEarnings = 20520 + 2000 + 280; // Example static logic from previous UI or dynamic

    const manifest = trip.bookings.map((b, idx) => ({
      id: b.id,
      seat: (b.bookedSeats && b.bookedSeats[0]) || `S${idx + 1}`,
      name: `${b.passenger.firstname} ${b.passenger.surname}`,
      ticketId: b.id,
      phone: b.passenger.phone || '—',
      status: b.status === 'confirmed' ? 'Checked In' : 'Pending'
    }));

    res.status(200).json({
      success: true,
      data: {
        id: trip.id,
        from: trip.departureTerminal,
        to: trip.arrivalTerminal,
        date: trip.departureDate,
        time: trip.departureTime || 'TBD',
        status: trip.status,
        driver: trip.driver?.fullName || 'Unassigned',
        driverInitials: trip.driver?.fullName
          ? trip.driver.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
          : '??',
        driverPhone: trip.driver?.phone || '—',
        bus: trip.bus?.registrationNumber || 'Unassigned',
        busCapacity: trip.availableSeats,
        passengers: trip.bookings.length,
        totalRevenue: grossRevenue, // backwards compat
        grossRevenue,
        netRevenue,
        deductions,
        driverEarnings,
        ticketPrice: trip.price,
        manifest
      }
    });
  } catch (error) {
    console.error('Error fetching trip by ID:', error);
    res.status(500).json({ message: 'Failed to fetch trip details', error: error.message });
  }
};

// ── POST /api/admin/trips ─────────────────────────────────────────────────────
exports.createTrip = async (req, res) => {
  try {
    const { busId, driverId, departureTerminal, arrivalTerminal, date, time, price } = req.body;

    const bus = busId ? await prisma.bus.findUnique({ where: { id: busId } }) : null;

    const trip = await prisma.trip.create({
      data: {
        departureDate: new Date(date),
        departureTime: time,
        departureTerminal,
        arrivalTerminal,
        availableSeats: bus?.totalCapacity || 50,
        price: parseFloat(price),
        busId: busId || null,
        driverId: driverId || null,
        status: 'Scheduled'
      }
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ message: 'Failed to create trip', error: error.message });
  }
};

// ── GET /api/admin/buses/available ────────────────────────────────────────────
exports.getAvailableBuses = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      where: { 
        status: 'Available',
        driver: null
      },
      select: {
        id: true,
        registrationNumber: true,
        nickname: true,
        totalCapacity: true,
        manufacturer: true,
        model: true
      }
    });

    const data = buses.map(b => ({
      id: b.id,
      label: `${b.registrationNumber}${b.nickname ? ` (${b.nickname})` : ''} — ${b.manufacturer} ${b.model}`,
      capacity: b.totalCapacity
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching available buses:', error);
    res.status(500).json({ message: 'Failed to fetch buses', error: error.message });
  }
};

// ── GET /api/admin/drivers/available ─────────────────────────────────────────
exports.getAvailableDrivers = async (req, res) => {
  try {
    // Drivers not currently on an Active trip
    const busyDriverIds = await prisma.trip.findMany({
      where: { status: 'Active', driverId: { not: null } },
      select: { driverId: true }
    }).then(trips => trips.map(t => t.driverId));

    const drivers = await prisma.driver.findMany({
      where: { id: { notIn: busyDriverIds } },
      select: { id: true, fullName: true, yearsOfExperience: true, phone: true }
    });

    const data = drivers.map(d => ({
      id: d.id,
      label: `${d.fullName} (${d.yearsOfExperience} yrs exp)`
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

// ── GET /api/admin/search?q= ──────────────────────────────────────────────────
exports.searchGlobal = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.status(200).json({ success: true, data: { trips: [], buses: [], drivers: [] } });

    const [trips, buses, drivers] = await Promise.all([
      prisma.trip.findMany({
        where: {
          OR: [
            { departureTerminal: { contains: q, mode: 'insensitive' } },
            { arrivalTerminal:   { contains: q, mode: 'insensitive' } },
          ]
        },
        take: 5,
        select: { id: true, departureTerminal: true, arrivalTerminal: true }
      }),
      prisma.bus.findMany({
        where: {
          OR: [
            { registrationNumber: { contains: q, mode: 'insensitive' } },
            { nickname:           { contains: q, mode: 'insensitive' } },
          ]
        },
        take: 5,
        select: { id: true, registrationNumber: true, nickname: true }
      }),
      prisma.driver.findMany({
        where: { fullName: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, fullName: true }
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        trips:   trips.map(t => ({ id: t.id, label: `${t.departureTerminal} → ${t.arrivalTerminal} (${t.id.substring(0, 8)})` })),
        buses:   buses.map(b => ({ id: b.id, label: `${b.registrationNumber}${b.nickname ? ` (${b.nickname})` : ''}` })),
        drivers: drivers.map(d => ({ id: d.id, label: d.fullName })),
      }
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

// ── GET /api/admin/notifications/count ───────────────────────────────────────
exports.getNotificationCount = async (req, res) => {
  try {
    // Count bookings created in the last 24h as a proxy for "new" notifications
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.booking.count({
      where: { createdAt: { gte: since } }
    });
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notification count', error: error.message });
  }
};
// ── PATCH /api/admin/drivers/:id/assign-bus ─────────────────────────────────
exports.assignBusToDriver = async (req, res) => {
  try {
    const { id } = req.params; // Driver ID
    const { busId } = req.body;

    if (!busId) {
      return res.status(400).json({ message: 'Bus ID is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify bus availability
      const bus = await tx.bus.findUnique({ where: { id: busId } });
      if (!bus) throw new Error('Bus not found');
      if (bus.status !== 'Available') throw new Error('BUS_NOT_AVAILABLE');

      // 2. Update Driver
      const driver = await tx.driver.update({
        where: { id },
        data: { 
          assignedBusId: busId,
          status: 'Active'
        },
        include: { assignedBus: true }
      });

      // 3. Update Bus status
      await tx.bus.update({ 
        where: { id: busId }, 
        data: { status: 'Assigned' } 
      });

      return driver;
    });

    res.status(200).json({ 
      success: true, 
      message: 'Bus assigned successfully', 
      data: result 
    });
  } catch (error) {
    console.error('Error in assignBusToDriver:', error);
    if (error.message === 'BUS_NOT_AVAILABLE') {
      return res.status(400).json({ message: 'This vehicle is currently unavailable for assignment' });
    }
    res.status(500).json({ 
      message: 'Failed to assign bus', 
      error: error.message 
    });
  }
};
// ── DELETE /api/admin/drivers/:id/unassign-bus ──────────────────────────────
exports.unassignBus = async (req, res) => {
  try {
    const { id } = req.params; // Driver ID

    await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({ 
        where: { id },
        include: { assignedBus: true }
      });
      if (!driver) throw new Error('Driver not found');
      
      // Guard Clause: Prevent unassignment if driver is mid-journey
      if (driver.status === 'On Trip') {
        throw new Error('UNASSIGN_FORBIDDEN_ON_TRIP');
      }

      if (driver.assignedBus) {
        const bus = driver.assignedBus;
        // Rule: Only reset status if it was Assigned or Active. Preservation of 'Maintenance'.
        if (['Assigned', 'Active'].includes(bus.status)) {
          await tx.bus.update({
            where: { id: bus.id },
            data: { status: 'Available' }
          });
        }
      }

      await tx.driver.update({
        where: { id },
        data: { assignedBusId: null }
      });
    });

    res.status(200).json({ 
      success: true, 
      message: 'Bus unassigned successfully' 
    });
  } catch (error) {
    console.error('Error in unassignBus:', error);
    if (error.message === 'UNASSIGN_FORBIDDEN_ON_TRIP') {
      return res.status(400).json({ message: 'Cannot unassign vehicle while driver is on a trip' });
    }
    res.status(500).json({ 
      message: 'Failed to unassign bus', 
      error: error.message 
    });
  }
};
