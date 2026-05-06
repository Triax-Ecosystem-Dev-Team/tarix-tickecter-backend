const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, createPassenger, getPassengerByLoginId } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/register', registerUser);
router.post('/passenger', createPassenger);
router.get('/passenger/:loginId', getPassengerByLoginId);
router.post('/login', loginUser);
router.get('/me', protect, getUserProfile);

module.exports = router;
