// Authentication routes
// Handles admin login and user information endpoints

const express = require('express');
const router = express.Router();
const { login, getMe, refreshToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');

router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);

module.exports = router;

