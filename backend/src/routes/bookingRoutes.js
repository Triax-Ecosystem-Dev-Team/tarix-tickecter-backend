const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBookingByReference,
  searchBookings,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, ticketer } = require('../middlewares/authMiddleware');

router.route('/')
  .post(protect, createBooking)
  .get(protect, getBookings);

router.route('/search')
  .get(protect, searchBookings);

router.route('/:reference')
  .get(protect, getBookingByReference);

router.route('/:id/status')
  .patch(protect, ticketer, updateBookingStatus);

module.exports = router;
