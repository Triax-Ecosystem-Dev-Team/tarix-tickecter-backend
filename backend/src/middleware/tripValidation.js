const prisma = require('../config/db');

/**
 * Middleware to check for bus and driver conflicts before creating or updating a trip.
 * It ensures the assigned bus and driver are not already busy during the selected time slot.
 */
const validateTripConflicts = async (req, res, next) => {
  try {
    const { busId, driverId, departureDate, departureTime } = req.body;
    const tripId = req.params.id; // For updates

    if (!departureDate || !departureTime) {
      return res.status(400).json({ message: 'Departure date and time are required' });
    }

    const requestedDate = new Date(departureDate);
    requestedDate.setHours(0, 0, 0, 0);

    // Conflict Check: Bus
    if (busId) {
      const busConflict = await prisma.trip.findFirst({
        where: {
          busId,
          departureDate: {
            gte: requestedDate,
            lte: new Date(new Date(requestedDate).setHours(23, 59, 59, 999))
          },
          id: { not: tripId }, // Exclude current trip if updating
          status: { not: 'Cancelled' }
        },
        include: { bus: true }
      });

      if (busConflict) {
        return res.status(409).json({ 
          message: `Schedule Conflict: Bus is already scheduled for a trip on this date.` 
        });
      }
    }

    // Conflict Check: Driver
    if (driverId) {
      const driverConflict = await prisma.trip.findFirst({
        where: {
          driverId,
          departureDate: {
            gte: requestedDate,
            lte: new Date(new Date(requestedDate).setHours(23, 59, 59, 999))
          },
          id: { not: tripId },
          status: { not: 'Cancelled' }
        },
        include: { driver: true }
      });

      if (driverConflict) {
        return res.status(409).json({ 
          message: `Schedule Conflict: Driver is already scheduled for a trip on this date.` 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Trip validation error:', error);
    res.status(500).json({ message: 'Error validating trip schedule', error: error.message });
  }
};

module.exports = { validateTripConflicts };
