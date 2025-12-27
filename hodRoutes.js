const express = require('express');
const router = express.Router();
const {
  createHOD,
  getAllHODs,
  updateHOD,
  deleteHOD,
  resetHODPassword
} = require('../controllers/hodController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
// Only HOD can access these routes

/**
 * @route   POST /api/hod
 * @desc    Create a new HOD account
 * @access  Private (HOD only)
 */
router.post('/', authenticate, authorize('hod'), createHOD);

/**
 * @route   GET /api/hod
 * @desc    Get all HOD accounts
 * @access  Private (HOD only)
 */
router.get('/', authenticate, authorize('hod'), getAllHODs);

/**
 * @route   PUT /api/hod/:id
 * @desc    Update HOD account details
 * @access  Private (HOD only)
 */
router.put('/:id', authenticate, authorize('hod'), updateHOD);

/**
 * @route   DELETE /api/hod/:id
 * @desc    Delete HOD account
 * @access  Private (HOD only)
 */
router.delete('/:id', authenticate, authorize('hod'), deleteHOD);

/**
 * @route   PUT /api/hod/:id/reset-password
 * @desc    Reset HOD password
 * @access  Private (HOD only)
 */
router.put('/:id/reset-password', authenticate, authorize('hod'), resetHODPassword);

module.exports = router;
