const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const { upload } = require('../utils/uploadMiddleware');

router.get('/', protect, restrictTo('Admin'), driverController.getDrivers);
router.post('/', protect, restrictTo('Admin'), upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'licenseFile', maxCount: 1 },
  { name: 'ninFile', maxCount: 1 }
]), driverController.createDriver);
router.get('/:id', protect, restrictTo('Admin'), driverController.getDriverById);

module.exports = router;
