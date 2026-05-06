const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleetController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/uploadMiddleware');
const documentAuth = require('../middlewares/documentAuth');

const uploadBusDocuments = upload.fields([
  { name: 'vehicleRegistrationCert', maxCount: 1 },
  { name: 'insuranceCert', maxCount: 1 },
  { name: 'roadworthinessCert', maxCount: 1 },
  { name: 'inspectionReport', maxCount: 1 },
  { name: 'emissionTestCert', maxCount: 1 },
  { name: 'busPhotos', maxCount: 5 }
]);

// ── Static routes FIRST (must be above /:id) ───────────────────────────────
router.get('/', protect, restrictTo('Admin'), fleetController.getFleet);
router.post('/', protect, restrictTo('Admin'), uploadBusDocuments, fleetController.createBus);
router.get('/performance', protect, restrictTo('Admin'), fleetController.getFleetPerformance);
router.get('/assets/available', protect, restrictTo('Admin'), fleetController.getAvailableAssets);
router.get('/report/:id', protect, restrictTo('Admin'), fleetController.getBusReport);
router.get('/documents/:filename', documentAuth, fleetController.serveBusDocument);

// ── Dynamic parameter routes LAST ───────────────────────────────────────────
router.get('/:id', protect, restrictTo('Admin'), fleetController.getBusById);
router.put('/:id', protect, restrictTo('Admin'), uploadBusDocuments, fleetController.updateBus);
router.patch('/:id/status', protect, restrictTo('Admin'), fleetController.updateBusStatus);
router.delete('/:id', protect, restrictTo('Admin'), fleetController.deleteBus);

module.exports = router;

