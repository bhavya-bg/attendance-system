const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  deleteLeave
} = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/leave
 * @desc    Apply for leave
 * @access  Private (Student)
 */
router.post('/', authenticate, authorize('student'), applyLeave);

/**
 * @route   GET /api/leave
 * @desc    Get own leave applications
 * @access  Private (Student)
 */
router.get('/', authenticate, authorize('student'), getMyLeaves);

/**
 * @route   GET /api/leave/all
 * @desc    Get all leave applications (HOD)
 * @access  Private (HOD)
 */
router.get('/all', authenticate, authorize('hod'), getAllLeaves);

/**
 * @route   PATCH /api/leave/:id
 * @desc    Update leave status (approve/reject)
 * @access  Private (HOD)
 */
router.patch('/:id', authenticate, authorize('hod'), updateLeaveStatus);

/**
 * @route   DELETE /api/leave/:id
 * @desc    Delete leave application (only pending)
 * @access  Private (Student)
 */
router.delete('/:id', authenticate, authorize('student'), deleteLeave);

module.exports = router;
