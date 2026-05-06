const prisma = require('../config/db');
const { uploadToCloudinary } = require('../utils/uploadMiddleware');

// @desc    Get all drivers with stats and assigned bus details
// @route   GET /api/drivers
// @access  Private/Admin
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        assignedBus: {
          select: {
            registrationNumber: true
          }
        },
        trips: {
          where: {
            status: 'Active'
          }
        }
      }
    });

    // Calculate Dashboard Stats
    const total = drivers.length;
    let active = 0;
    let onTrip = 0;
    let inactive = 0;

    const today = new Date();

    const enhancedDrivers = drivers.map(driver => {
      let status = 'Active';
      
      // Override status if license is expired
      const isExpired = driver.licenseExpiryDate && new Date(driver.licenseExpiryDate) < today;
      
      const hasActiveTrip = driver.trips.length > 0;

      if (isExpired) {
        status = 'Inactive'; // Or 'Expired' if we want a new category
      } else if (hasActiveTrip) {
        status = 'On Trip';
      }

      // Increment stats
      if (status === 'Active') active++;
      else if (status === 'On Trip') onTrip++;
      else inactive++;

      return {
        ...driver,
        status,
        isLicenseExpired: isExpired,
        assignedBusNumber: driver.assignedBus?.registrationNumber || 'Not assigned',
        displayId: driver.driverId // Use the sequential ID for display
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        onTrip,
        inactive
      },
      drivers: enhancedDrivers
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

// @desc    Get driver by ID
// @route   GET /api/drivers/:id
// @access  Private/Admin
exports.getDriverById = async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        assignedBus: true,
        trips: {
          take: 10,
          orderBy: { departureDate: 'desc' }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver', error: error.message });
  }
};

// @desc    Register a new driver
// @route   POST /api/drivers
// @access  Private/Admin
exports.createDriver = async (req, res) => {
  try {
    const {
      fullName, email, phone, bloodGroup, homeAddress,
      licenseNumber, yearsOfExperience, licenseIssueDate, licenseExpiryDate,
      monthlySalary, emergencyContactName, emergencyContactPhone,
      assignedBusId, employmentDate
    } = req.body;

    // 1. Validation: License must be in the future
    if (new Date(licenseExpiryDate) <= new Date()) {
      return res.status(400).json({ message: 'License expiry date must be a future date' });
    }

    // 2. Sequential ID generation: DRV-001, DRV-002...
    const lastDriver = await prisma.driver.findFirst({
      orderBy: { driverId: 'desc' },
      select: { driverId: true }
    });

    let nextIdNumber = 1;
    if (lastDriver && lastDriver.driverId.startsWith('DRV-')) {
      const lastIdParts = lastDriver.driverId.split('-');
      if (lastIdParts.length === 2) {
        nextIdNumber = parseInt(lastIdParts[1]) + 1;
      }
    }
    const driverId = `DRV-${nextIdNumber.toString().padStart(3, '0')}`;

    // 3. File Processing (Multer handles the local saves)
    let profilePhotoUrl = null;
    let licenseFileUrl = null;
    let ninFileUrl = null;

    try {
      if (req.files) {
        // Profile Photo -> Cloudinary
        if (req.files.profilePhoto) {
          profilePhotoUrl = await uploadToCloudinary(req.files.profilePhoto[0].path, 'drivers/profiles');
        }

        // License PDF -> Local Storage (Already saved by multer)
        if (req.files.licenseFile) {
          licenseFileUrl = `/uploads/documents/${req.files.licenseFile[0].filename}`;
        }

        // NIN PDF -> Local Storage (Already saved by multer)
        if (req.files.ninFile) {
          ninFileUrl = `/uploads/documents/${req.files.ninFile[0].filename}`;
        }
      }

      // 4. Create Prisma Record
      const driver = await prisma.driver.create({
        data: {
          driverId,
          fullName,
          email,
          phone,
          bloodGroup,
          homeAddress,
          licenseNumber,
          yearsOfExperience: parseInt(yearsOfExperience),
          licenseIssueDate: new Date(licenseIssueDate),
          licenseExpiryDate: new Date(licenseExpiryDate),
          employmentDate: employmentDate ? new Date(employmentDate) : new Date(),
          monthlySalary: parseFloat(monthlySalary),
          emergencyContactName,
          emergencyContactPhone,
          profilePhotoUrl,
          licenseFileUrl,
          ninFileUrl,
          assignedBusId: assignedBusId || null
        }
      });

      res.status(201).json({
        success: true,
        message: `Driver registered successfully: ${driverId}`,
        driver
      });
    } catch (innerError) {
      console.error('Driver Registration Error:', innerError);
      return res.status(500).json({ 
        error: "Internal Server Error",
        message: innerError.code === 'P2002'
          ? 'A driver with that email or license number already exists.'
          : "An unexpected error occurred during the driver operation."
      });
    }
  } catch (error) {
    // Outer catch: handles validation, ID generation, or unexpected pre-upload failures
    console.error("Driver Operation Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred during the driver operation."
    });
  }
};
