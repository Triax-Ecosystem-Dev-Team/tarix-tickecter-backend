const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/data', protect, admin, reportController.getReportData);
router.post('/schedules', protect, admin, reportController.createSchedule);
router.get('/schedules', protect, admin, reportController.getSchedules);
router.post('/history', protect, admin, reportController.logReportGeneration);
router.get('/history', protect, admin, reportController.getHistory);

module.exports = router;
