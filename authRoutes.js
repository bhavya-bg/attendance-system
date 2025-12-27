const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, validateHodId } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth/validate-hod-id
 * @desc    Validate if HOD ID exists
 * @access  Public
 */
router.post('/validate-hod-id', validateHodId);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, changePassword);

module.exports = router;
