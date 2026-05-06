const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/cloudinary');

router.use(protect);
router.use(restrictTo('Admin'));

// ── Staff & Driver Management ─────────────────────────────────────────────────
router.get('/staff', adminController.getStaff);
router.get('/staff/:id', adminController.getStaffById);
router.post('/ticketers', upload.single('profilePhoto'), adminController.createTicketer);
router.patch('/ticketers/:id', upload.single('profilePhoto'), adminController.updateTicketer);

router.get('/drivers', adminController.getDrivers);
router.get('/drivers/:id', adminController.getDriverById);
router.post('/drivers', upload.single('profilePhoto'), adminController.createDriver);
router.patch('/drivers/:id', upload.single('profilePhoto'), adminController.updateDriver);
router.patch('/drivers/:id/assign-bus', adminController.assignBusToDriver);
router.delete('/drivers/:id/unassign-bus', adminController.unassignBus);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);
router.get('/revenue-trend', adminController.getRevenueTrend);
router.get('/active-trips', adminController.getActiveTrips);

// ── Trips ─────────────────────────────────────────────────────────────────────
router.get('/trips', adminController.getTrips);
router.post('/trips', adminController.createTrip);
router.get('/trips/:tripId', adminController.getTripById);

// ── Form Options ──────────────────────────────────────────────────────────────
router.get('/buses/available', adminController.getAvailableBuses);
router.get('/drivers/available', adminController.getAvailableDrivers);

// ── Search & Notifications ────────────────────────────────────────────────────
router.get('/search', adminController.searchGlobal);
router.get('/notifications/count', adminController.getNotificationCount);

module.exports = router;
