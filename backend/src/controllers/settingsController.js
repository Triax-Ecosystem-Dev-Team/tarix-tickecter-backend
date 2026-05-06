const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public (or Auth)
const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.systemSettings.findFirst();

    // If no settings exist yet, create the default one
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          extraBaggagePrice: 2000
        }
      });
    }

    sendResponse(res, 200, settings, 'Settings fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res, next) => {
  try {
    const { extraBaggagePrice } = req.body;

    if (extraBaggagePrice === undefined || isNaN(extraBaggagePrice)) {
      return sendResponse(res, 400, null, 'Please provide a valid extraBaggagePrice');
    }

    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { extraBaggagePrice: parseFloat(extraBaggagePrice) }
      });
    } else {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { extraBaggagePrice: parseFloat(extraBaggagePrice) }
      });
    }

    sendResponse(res, 200, settings, 'Settings updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
