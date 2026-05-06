const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/cloudinary');

// Middleware to handle multiple file uploads
const uploadBusDocuments = upload.fields([
  { name: 'vehicleRegistrationCert', maxCount: 1 },
  { name: 'insuranceCert', maxCount: 1 },
  { name: 'roadworthinessCert', maxCount: 1 },
  { name: 'inspectionReport', maxCount: 1 },
  { name: 'emissionTestCert', maxCount: 1 },
  { name: 'busPhotos', maxCount: 5 }
]);

router.post('/', protect, restrictTo('Admin'), uploadBusDocuments, busController.createBus);
router.get('/', protect, restrictTo('Admin'), busController.getBuses);

module.exports = router;
