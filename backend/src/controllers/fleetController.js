const prisma = require('../config/db');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary } = require('../utils/uploadMiddleware');

// Get fleet aggregates and list of buses
exports.getFleet = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        driver: true,
        trips: true,
      },
    });

    // Calculate aggregations
    const total = buses.length;
    const available = buses.filter(b => b.status === 'Available' || b.maintenanceStatus === 'Excellent' || b.maintenanceStatus === 'Good').length; // Depending on how status is modeled
    // Note: status field does not exist on bus in schema. It's on Trip and Booking. Let's infer from trips or maintenance status, or just add a mock status for now, wait.
    // The instructions say "return counts for each status... Total, Available, Maintenance".
    // I see in FleetManagement it uses "Available", "On Trip", "Maintenance". Let's calculate:
    
    // In schema, Bus doesn't have a direct "status" enum besides "maintenanceStatus" (Excellent, Good, Fair, Poor). Wait, the mock data uses `status: 'On Trip' | 'Available' | 'Maintenance'`.
    // I can compute this: 
    // On Trip = buses that have an active Trip.
    // Maintenance = buses with maintenanceStatus = 'Poor' or similar.
    // Available = rest.
    const fleetStats = {
      total,
      available: 0,
      onTrip: 0,
      maintenance: 0,
    };

    const enhancedBuses = buses.map(bus => {
      let status = 'Available';
      if (bus.maintenanceStatus === 'Poor' || bus.maintenanceStatus === 'Fair') {
        status = 'Maintenance';
        fleetStats.maintenance += 1;
      } else if (bus.trips && bus.trips.some(t => t.status === 'Active')) {
        status = 'On Trip';
        fleetStats.onTrip += 1;
      } else {
        status = 'Available';
        fleetStats.available += 1;
      }

      // Calculate other stats like revenue, utilization from trips
      const tripsCount = bus.trips.length;
      const revenue = bus.trips.reduce((sum, t) => sum + (t.price || 0), 0);
      
      return {
        ...bus,
        status,
        tripsCount,
        revenue: `₦${revenue.toLocaleString()}`,
        utilization: Math.floor(Math.random() * 40) + 60, // Mocked utilization as requested generic or just random
        tokens: (revenue * 0.1).toLocaleString(),
        rating: '4.8/5', // mock
        issues: bus.maintenanceStatus === 'Poor' ? 1 : 0,
        avgTrip: '8h 20m', // mock
        capacity: `${bus.totalCapacity} seats`,
        plate: bus.registrationNumber,
        service: bus.lastServiceDate ? new Date(bus.lastServiceDate).toLocaleDateString() : '--',
        type: bus.manufacturer + ' ' + bus.model,
      };
    });

    res.status(200).json({
      success: true,
      stats: fleetStats,
      buses: enhancedBuses
    });
  } catch (error) {
    console.error('Error fetching fleet data:', error);
    res.status(500).json({ message: 'Failed to fetch fleet data', error: error.message });
  }
};

// Create a new bus
exports.createBus = async (req, res) => {
  try {
    const {
      registrationNumber, nickname, chassisNumber, engineNumber,
      ownerName, ownerPhone, registrationDate, insuranceProvider,
      insuranceExpiry, manufacturer, model, year, color, fuelType,
      totalCapacity, availableSeats, wheelchairSeats, busLength,
      busWidth, busHeight, currentMileage, lastServiceDate,
      nextServiceDue, engineCapacity, maintenanceStatus,
      transmissionType, amenities
    } = req.body;

    // Upload Handling Strategy:
    // Files are uploaded via multipart/form-data using a middleware (like multer + Cloudinary).
    // The URLs are stored in req.files by the middleware.
    const files = req.files || {};
    
    const bus = await prisma.bus.create({
      data: {
        registrationNumber,
        nickname,
        chassisNumber,
        engineNumber,
        ownerName,
        ownerPhone,
        registrationDate: registrationDate ? new Date(registrationDate) : null,
        insuranceProvider,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        manufacturer,
        model,
        year: parseInt(year),
        color,
        fuelType,
        totalCapacity: parseInt(totalCapacity),
        availableSeats: parseInt(availableSeats),
        wheelchairSeats: wheelchairSeats ? parseInt(wheelchairSeats) : null,
        busLength: busLength ? parseFloat(busLength) : null,
        busWidth: busWidth ? parseFloat(busWidth) : null,
        busHeight: busHeight ? parseFloat(busHeight) : null,
        currentMileage: currentMileage ? parseInt(currentMileage) : null,
        lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null,
        nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
        engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
        maintenanceStatus: maintenanceStatus || 'Excellent',
        transmissionType,
        amenities: Array.isArray(amenities) ? amenities : (amenities ? JSON.parse(amenities) : []),
        
        // Documents are stored locally and accessed via a protected route
        vehicleRegistrationCertUrl: files.vehicleRegistrationCert ? `/api/fleet/documents/${path.basename(files.vehicleRegistrationCert[0].path)}` : null,
        insuranceCertUrl: files.insuranceCert ? `/api/fleet/documents/${path.basename(files.insuranceCert[0].path)}` : null,
        roadworthinessCertUrl: files.roadworthinessCert ? `/api/fleet/documents/${path.basename(files.roadworthinessCert[0].path)}` : null,
        inspectionReportUrl: files.inspectionReport ? `/api/fleet/documents/${path.basename(files.inspectionReport[0].path)}` : null,
        emissionTestCertUrl: files.emissionTestCert ? `/api/fleet/documents/${path.basename(files.emissionTestCert[0].path)}` : null,
        
        // Photos are uploaded to Cloudinary
        busPhotosUrls: files.busPhotos ? await Promise.all(files.busPhotos.map(f => uploadToCloudinary(f.path, 'bus-photos'))) : [],
      }
    });

    res.status(201).json({ 
      message: `Asset registered: ${registrationNumber}`, 
      bus 
    });
  } catch (error) {
    console.error('Error creating bus:', error);

    // Surface specific Cloudinary upload errors for targeted frontend toasts
    if (error.http_code === 499 || error.message?.includes('timeout')) {
      return res.status(504).json({ message: 'Cloudinary Timeout: File upload took too long. Try a smaller file.' });
    }
    if (error.http_code === 401 || error.message?.includes('Invalid API')) {
      return res.status(502).json({ message: 'Cloudinary Error: Upload service authentication failed. Contact support.' });
    }
    if (error.message?.includes('Only PDF') || error.message?.includes('Only image')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum allowed size is 10MB per file.' });
    }

    res.status(500).json({ message: 'Failed to create bus', error: error.message });
  }
};

// Update Bus Status
exports.updateBusStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Fetch current bus state with active trips
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: { 
        trips: { 
          where: { 
            status: { in: ['Active', 'En Route'] } 
          } 
        } 
      }
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // 2. Operational Lock Check
    const hasActiveTrip = bus.trips.length > 0;
    if (hasActiveTrip && (status === 'Maintenance' || status === 'Available')) {
      const activeTrip = bus.trips[0];
      return res.status(409).json({ 
        message: 'Conflict: Bus is currently assigned to an active trip.',
        activeTrip: {
          id: activeTrip.id,
          departureTerminal: activeTrip.departureTerminal,
          arrivalTerminal: activeTrip.arrivalTerminal,
          requiredCapacity: activeTrip.availableSeats // Assuming we need to match or exceed this
        }
      });
    }

    // 3. Map status to maintenanceStatus
    let maintenanceStatus = bus.maintenanceStatus;
    if (status === 'Available') maintenanceStatus = 'Excellent';
    if (status === 'Maintenance') maintenanceStatus = 'Poor';

    const updatedBus = await prisma.bus.update({
      where: { id },
      data: { maintenanceStatus },
    });

    res.status(200).json({ message: `Bus status changed to ${status}`, bus: updatedBus });
  } catch (error) {
    console.error('Error updating bus status:', error);
    res.status(500).json({ message: 'Failed to update bus status', error: error.message });
  }
};

// Get Bus by ID
exports.getBusById = async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: { driver: true, trips: true }
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.status(200).json({ success: true, bus });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bus', error: error.message });
  }
};

// Update Bus
exports.updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const files = req.files || {};

    const updatePayload = {
      ...data,
      year: data.year ? parseInt(data.year) : undefined,
      totalCapacity: data.totalCapacity ? parseInt(data.totalCapacity) : undefined,
      availableSeats: data.availableSeats ? parseInt(data.availableSeats) : undefined,
      wheelchairSeats: data.wheelchairSeats ? parseInt(data.wheelchairSeats) : undefined,
      busLength: data.busLength ? parseFloat(data.busLength) : undefined,
      busWidth: data.busWidth ? parseFloat(data.busWidth) : undefined,
      busHeight: data.busHeight ? parseFloat(data.busHeight) : undefined,
      currentMileage: data.currentMileage ? parseInt(data.currentMileage) : undefined,
      engineCapacity: data.engineCapacity ? parseInt(data.engineCapacity) : undefined,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : undefined,
      lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : undefined,
      nextServiceDue: data.nextServiceDue ? new Date(data.nextServiceDue) : undefined,
      amenities: data.amenities ? (Array.isArray(data.amenities) ? data.amenities : JSON.parse(data.amenities)) : undefined,
    };

    // File handling
    if (files.vehicleRegistrationCert) updatePayload.vehicleRegistrationCertUrl = files.vehicleRegistrationCert[0].path;
    if (files.insuranceCert) updatePayload.insuranceCertUrl = files.insuranceCert[0].path;
    if (files.roadworthinessCert) updatePayload.roadworthinessCertUrl = files.roadworthinessCert[0].path;
    if (files.inspectionReport) updatePayload.inspectionReportUrl = files.inspectionReport[0].path;
    if (files.emissionTestCert) updatePayload.emissionTestCertUrl = files.emissionTestCert[0].path;
    if (files.busPhotos) updatePayload.busPhotosUrls = files.busPhotos.map(f => f.path);

    const bus = await prisma.bus.update({
      where: { id },
      data: updatePayload,
    });

    res.status(200).json({ message: 'Bus updated successfully', bus });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({ message: 'Failed to update bus', error: error.message });
  }
};

// Delete / Decommission Bus
exports.deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Check if admin is forcing decommission

    // 1. Check for active trips
    const activeTrips = await prisma.trip.findMany({
      where: { 
        busId: id,
        status: { in: ['Active', 'En Route'] }
      }
    });

    if (activeTrips.length > 0 && force !== 'true') {
      return res.status(400).json({ 
        message: 'Operational Lock: Bus has active trips. Use "Force Decommission" to cancel them and remove the bus.' 
      });
    }

    // 2. If forcing, cancel trips first
    if (activeTrips.length > 0 && force === 'true') {
      await prisma.trip.updateMany({
        where: { id: { in: activeTrips.map(t => t.id) } },
        data: { status: 'Cancelled' }
      });
    }

    // 3. Delete the bus (logical archive recommended in production, but here we follow deleteBus)
    await prisma.bus.delete({ where: { id } });

    res.status(200).json({ message: 'Bus decommissioned successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({ message: 'Failed to delete bus', error: error.message });
  }
};

// @desc    Get Bus Performance & Lifecycle Report
// @route   GET /api/fleet/report/:id
// @access  Private/Admin
exports.getBusReport = async (req, res) => {
  try {
    const { id } = req.params;

    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        trips: {
          include: {
            bookings: {
              where: { status: { not: 'cancelled' } },
            select: { totalPrice: true, bookedSeats: true }
            }
          }
        },
        driver: true
      }
    });

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Calculations
    const totalTrips = bus.trips.length;
    let lifetimeRevenue = 0;
    let totalPassengers = 0;

    bus.trips.forEach(trip => {
      trip.bookings.forEach(booking => {
        lifetimeRevenue += booking.totalPrice || 0;
        totalPassengers += (booking.bookedSeats || []).length;
      });
    });

    // Dummy maintenance cost for ratio calculation (in real app, this would come from a Maintenance table)
    const estimatedMaintenanceCost = totalTrips * 15000; // Average ₦15k per trip
    const maintenanceRatio = lifetimeRevenue > 0 ? (estimatedMaintenanceCost / lifetimeRevenue) * 100 : 0;

    const report = {
      busDetails: {
        registrationNumber: bus.registrationNumber,
        nickname: bus.nickname,
        manufacturer: bus.manufacturer,
        model: bus.model,
        year: bus.year,
        status: bus.maintenanceStatus,
      },
      stats: {
        lifetimeRevenue,
        totalTrips,
        totalPassengers,
        maintenanceRatio: maintenanceRatio.toFixed(1),
        utilizationRate: totalTrips > 0 ? 85 : 0, // Mocked for now
        avgRating: 4.8 // Mocked for now
      },
      tripHistory: bus.trips.slice(0, 10).map(t => ({
        id: t.id,
        route: `${t.departureTerminal} → ${t.arrivalTerminal}`,
        date: t.departureDate,
        revenue: t.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
        passengers: t.bookings.reduce((sum, b) => sum + (b.bookedSeats?.length || 0), 0)
      }))
    };

    res.status(200).json(report);
  } catch (error) {
    console.error('Error generating bus report:', error);
    res.status(500).json({ message: 'Failed to generate bus report', error: error.message });
  }
};

// @desc    Serve protected bus document
// @route   GET /api/fleet/documents/:filename
// @access  Private/Admin
exports.serveBusDocument = async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: Prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads/documents', sanitizedFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ message: 'Failed to serve document' });
  }
};

// @desc    Get Weekly Fleet Performance Analytics
// @route   GET /api/fleet/performance
// @access  Private/Admin
exports.getFleetPerformance = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 1. Total Revenue from confirmed bookings in last 7 days
    const revenueAggregate = await prisma.booking.aggregate({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: 'confirmed'
      },
      _sum: {
        totalPrice: true
      }
    });
    const totalRevenue = revenueAggregate._sum.totalPrice || 0;

    // 2. Total Trips in last 7 days
    const trips = await prisma.trip.findMany({
      where: {
        departureDate: { gte: sevenDaysAgo, lte: today }
      },
      include: {
        bookings: {
          where: { status: 'confirmed' },
          select: { seats: true }
        },
        bus: {
          select: { totalCapacity: true }
        }
      }
    });

    const totalTrips = trips.length;

    // 3. Daily Stats (Mon-Sun)
    // We'll map the last 7 days to Mon-Sun slots
    const dailyStats = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    
    trips.forEach(trip => {
      const dayIndex = new Date(trip.departureDate).getDay(); // 0 is Sun, 1 is Mon...
      const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Map Sun to 6, Mon to 0...
      dailyStats[mappedIndex]++;
    });

    // 4. Average Utilization
    let totalUtilization = 0;
    if (totalTrips > 0) {
      trips.forEach(trip => {
        const bookedSeats = trip.bookings.reduce((sum, b) => sum + (b.seats || 0), 0);
        const capacity = trip.bus?.totalCapacity || 50; // Fallback capacity
        totalUtilization += (bookedSeats / capacity) * 100;
      });
    }
    const avgUtilization = totalTrips > 0 ? Math.round(totalUtilization / totalTrips) : 0;

    // 5. Tokens (10:1 ratio)
    const totalTokens = totalRevenue / 10;

    res.status(200).json({
      totalRevenue,
      totalTrips,
      avgUtilization,
      totalTokens,
      dailyStats
    });
  } catch (error) {
    console.error('Error fetching fleet performance:', error);
    res.status(500).json({ message: 'Failed to fetch fleet performance', error: error.message });
  }
};

// @desc    Get Available Buses and Drivers for Trip Creation
// @route   GET /api/fleet/assets/available
// @access  Private/Admin
exports.getAvailableAssets = async (req, res) => {
  try {
    // Fetch all buses
    const buses = await prisma.bus.findMany({
      select: {
        id: true,
        registrationNumber: true,
        nickname: true,
        totalCapacity: true,
        amenities: true,
        maintenanceStatus: true,
        trips: {
          where: {
            status: { in: ['Scheduled', 'Active'] },
            departureDate: { gte: new Date(new Date().setHours(0,0,0,0)) }
          }
        }
      }
    });

    const busesWithStatus = buses.map(bus => {
      const isOnTrip = bus.trips.some(t => t.status === 'Active');
      return {
        id: bus.id,
        registrationNumber: bus.registrationNumber,
        nickname: bus.nickname,
        totalCapacity: bus.totalCapacity,
        amenities: bus.amenities,
        maintenanceStatus: bus.maintenanceStatus,
        status: isOnTrip ? 'On Trip' : 'Available'
      };
    });

    // Fetch all drivers
    const rawDrivers = await prisma.driver.findMany({
      select: {
        id: true,
        fullName: true
      }
    });

    // Map fullName to name for frontend compatibility
    const drivers = rawDrivers.map(d => ({
      id: d.id,
      name: d.fullName
    }));

    res.status(200).json({
      success: true,
      buses: busesWithStatus,
      drivers
    });
  } catch (error) {
    console.error('Error fetching available assets:', error);
    res.status(500).json({ message: 'Failed to fetch available assets', error: error.message });
  }
};

// All functions are exported via exports.functionName above
