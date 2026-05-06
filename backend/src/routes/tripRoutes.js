const express = require('express');
const router = express.Router();
const {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  reassignBus,
} = require('../controllers/tripController');
const { protect, admin } = require('../middlewares/authMiddleware');
const { validateTripConflicts } = require('../middleware/tripValidation');

router.route('/')
  .get(getTrips)
  .post(protect, admin, validateTripConflicts, createTrip);

router.route('/:id')
  .get(getTripById)
  .put(protect, admin, validateTripConflicts, updateTrip)
  .delete(protect, admin, deleteTrip);

router.patch('/:id/reassign-bus', protect, admin, reassignBus);

module.exports = router;
