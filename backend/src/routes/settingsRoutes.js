const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getSettings)
  .put(protect, admin, updateSettings);

module.exports = router;
