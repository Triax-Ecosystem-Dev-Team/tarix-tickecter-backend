const express = require('express');
const router = express.Router();
const { getFleetStatus, getTripPassengers, updateTripStatus, getSalesStats } = require('../controllers/dispatchController');
const { protect, ticketer } = require('../middlewares/authMiddleware');

router.route('/status')
  .get(protect, ticketer, getFleetStatus);

router.route('/sales-stats')
  .get(protect, ticketer, getSalesStats);

router.route('/trips/:tripId/passengers')
  .get(protect, ticketer, getTripPassengers);

router.route('/trips/:tripId/status')
  .patch(protect, ticketer, updateTripStatus);

module.exports = router;
