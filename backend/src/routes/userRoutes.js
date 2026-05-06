const express = require('express');
const router = express.Router();
const { updateProfile, changePassword, toggle2FA, updatePreferences } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const { upload } = require('../utils/supabaseStorage');

router.patch('/profile', protect, upload.single('avatar'), updateProfile);
router.patch('/security/password', protect, changePassword);
router.patch('/security/2fa', protect, toggle2FA);
router.patch('/preferences', protect, updatePreferences);

module.exports = router;
