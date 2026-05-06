const prisma = require('../config/db');

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

    // Handle uploaded files (from Cloudinary)
    const files = req.files || {};
    
    // Create the bus record
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
        maintenanceStatus,
        transmissionType,
        amenities: Array.isArray(amenities) ? amenities : (amenities ? JSON.parse(amenities) : []),
        
        vehicleRegistrationCertUrl: files.vehicleRegistrationCert ? files.vehicleRegistrationCert[0].path : null,
        insuranceCertUrl: files.insuranceCert ? files.insuranceCert[0].path : null,
        roadworthinessCertUrl: files.roadworthinessCert ? files.roadworthinessCert[0].path : null,
        inspectionReportUrl: files.inspectionReport ? files.inspectionReport[0].path : null,
        emissionTestCertUrl: files.emissionTestCert ? files.emissionTestCert[0].path : null,
        busPhotosUrls: files.busPhotos ? files.busPhotos.map(f => f.path) : [],
      }
    });

    res.status(201).json({ message: 'Bus created successfully', bus });
  } catch (error) {
    console.error('Error creating bus:', error);
    res.status(500).json({ message: 'Failed to create bus', error: error.message });
  }
};

// Get all buses
exports.getBuses = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        drivers: true,
        trips: true
      }
    });
    res.status(200).json({ buses });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ message: 'Failed to fetch buses', error: error.message });
  }
};

// Get bus by ID
exports.getBusById = async (req, res) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.id },
      include: {
        drivers: true,
        trips: true
      }
    });

    if (bus) {
      res.status(200).json({ bus });
    } else {
      res.status(404).json({ message: 'Bus not found' });
    }
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ message: 'Failed to fetch bus', error: error.message });
  }
};

// Update bus
exports.updateBus = async (req, res) => {
  try {
    const busExists = await prisma.bus.findUnique({
      where: { id: req.params.id }
    });

    if (!busExists) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const {
      registrationNumber, nickname, chassisNumber, engineNumber,
      ownerName, ownerPhone, registrationDate, insuranceProvider,
      insuranceExpiry, manufacturer, model, year, color, fuelType,
      totalCapacity, availableSeats, wheelchairSeats, busLength,
      busWidth, busHeight, currentMileage, lastServiceDate,
      nextServiceDue, engineCapacity, maintenanceStatus,
      transmissionType, amenities
    } = req.body;

    const dataToUpdate = { ...req.body };
    
    if (year) dataToUpdate.year = parseInt(year);
    if (totalCapacity) dataToUpdate.totalCapacity = parseInt(totalCapacity);
    if (availableSeats) dataToUpdate.availableSeats = parseInt(availableSeats);
    if (wheelchairSeats !== undefined) dataToUpdate.wheelchairSeats = wheelchairSeats ? parseInt(wheelchairSeats) : null;
    if (busLength !== undefined) dataToUpdate.busLength = busLength ? parseFloat(busLength) : null;
    if (busWidth !== undefined) dataToUpdate.busWidth = busWidth ? parseFloat(busWidth) : null;
    if (busHeight !== undefined) dataToUpdate.busHeight = busHeight ? parseFloat(busHeight) : null;
    if (currentMileage !== undefined) dataToUpdate.currentMileage = currentMileage ? parseInt(currentMileage) : null;
    if (engineCapacity !== undefined) dataToUpdate.engineCapacity = engineCapacity ? parseInt(engineCapacity) : null;
    
    if (registrationDate !== undefined) dataToUpdate.registrationDate = registrationDate ? new Date(registrationDate) : null;
    if (insuranceExpiry !== undefined) dataToUpdate.insuranceExpiry = insuranceExpiry ? new Date(insuranceExpiry) : null;
    if (lastServiceDate !== undefined) dataToUpdate.lastServiceDate = lastServiceDate ? new Date(lastServiceDate) : null;
    if (nextServiceDue !== undefined) dataToUpdate.nextServiceDue = nextServiceDue ? new Date(nextServiceDue) : null;

    if (amenities !== undefined) {
      dataToUpdate.amenities = Array.isArray(amenities) ? amenities : (amenities ? JSON.parse(amenities) : []);
    }

    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });

    res.status(200).json({ message: 'Bus updated successfully', bus });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({ message: 'Failed to update bus', error: error.message });
  }
};

// Delete bus
exports.deleteBus = async (req, res) => {
  try {
    const busExists = await prisma.bus.findUnique({
      where: { id: req.params.id }
    });

    if (!busExists) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    await prisma.bus.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({ message: 'Failed to delete bus', error: error.message });
  }
};
