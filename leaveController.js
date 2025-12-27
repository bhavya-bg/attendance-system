const Leave = require('../models/Leave');

// Student applies for leave
exports.applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const studentId = req.user._id;

    // Make sure all required fields are filled
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start date, end date, and reason for leave'
      });
    }

    // Check if dates make sense
    const leaveStartDate = new Date(startDate);
    const leaveEndDate = new Date(endDate);

    // Start date should be before or same as end date
    if (leaveStartDate > leaveEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Cannot apply for leave in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (leaveStartDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply for leave for past dates'
      });
    }

    // Create the leave application
    const leaveApplication = await Leave.create({
      user: studentId,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason,
      status: 'pending' // Waiting for admin approval
    });

    // Add student details to response
    await leaveApplication.populate('user', 'name email rollNumber department');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully! Waiting for approval',
      data: { leave: leaveApplication }
    });
  } catch (error) {
    console.error('Failed to apply for leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave application. Please try again',
      error: error.message
    });
  }
};

// Get student's own leave applications
exports.getMyLeaves = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { status, limit = 20 } = req.query;

    // Build search query
    let searchQuery = { user: studentId };
    // Filter by status if needed (pending/approved/rejected)
    if (status) {
      searchQuery.status = status;
    }

    // Get all leave applications
    const leaveApplications = await Leave.find(searchQuery)
      .sort({ createdAt: -1 }) // Show newest applications first
      .limit(parseInt(limit))
      .populate('user', 'name email rollNumber department')
      .populate('approvedBy', 'name email'); // Show who approved/rejected

    // Calculate some useful statistics
    const statistics = {
      total: leaveApplications.length,
      pending: leaveApplications.filter(leave => leave.status === 'pending').length,
      approved: leaveApplications.filter(leave => leave.status === 'approved').length,
      rejected: leaveApplications.filter(leave => leave.status === 'rejected').length
    };

    res.json({
      success: true,
      count: leaveApplications.length,
      data: { 
        leaves: leaveApplications,
        stats: statistics
      }
    });
  } catch (error) {
    console.error('Failed to get leave applications:', error);
    res.status(500).json({
      success: false,
      message: 'Could not load leave applications. Please try again',
      error: error.message
    });
  }
};

// HOD can view all students' leave applications
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, userId, limit = 50, page = 1 } = req.query;

    // Build search query based on HOD's filter
    let searchQuery = {};
    
    // If user is HOD, filter by their department only
    if (req.user.role === 'hod') {
      // Find all users in the same department
      const User = require('../models/User');
      const departmentStudents = await User.find({
        department: req.user.department,
        role: 'student'
      }).select('_id');
      
      const studentIds = departmentStudents.map(s => s._id);
      searchQuery.user = { $in: studentIds };
    }
    
    if (status) {
      searchQuery.status = status; // Filter by status
    }
    if (userId) {
      searchQuery.user = userId; // Filter by specific student
    }

    // Calculate pagination
    const recordsToSkip = (parseInt(page) - 1) * parseInt(limit);

    // Get leave applications
    const leaveApplications = await Leave.find(searchQuery)
      .sort({ createdAt: -1 }) // Newest first
      .skip(recordsToSkip)
      .limit(parseInt(limit))
      .populate('user', 'name email rollNumber department')
      .populate('approvedBy', 'name email');

    // Count total matching records
    const totalRecords = await Leave.countDocuments(searchQuery);

    res.json({
      success: true,
      count: leaveApplications.length,
      total: totalRecords,
      page: parseInt(page),
      pages: Math.ceil(totalRecords / parseInt(limit)),
      data: { leaves: leaveApplications }
    });
  } catch (error) {
    console.error('Failed to get all leave applications:', error);
    res.status(500).json({
      success: false,
      message: 'Could not load leave applications. Please try again',
      error: error.message
    });
  }
};

// HOD approves or rejects a leave application
exports.updateLeaveStatus = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { status, adminRemarks } = req.body;
    const hodUserId = req.user._id;

    // Make sure HOD provided valid status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please choose either "approved" or "rejected"'
      });
    }

    // Find the leave application
    const leaveApplication = await Leave.findById(leaveId);
    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Cannot update if already approved/rejected
    if (leaveApplication.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This leave was already ${leaveApplication.status}`
      });
    }

    // Update the leave status
    leaveApplication.status = status;
    leaveApplication.adminRemarks = adminRemarks; // Optional note from HOD
    leaveApplication.approvedBy = hodUserId;
    leaveApplication.approvedAt = new Date();

    await leaveApplication.save();

    // Add user details to response
    await leaveApplication.populate('user', 'name email rollNumber department');
    await leaveApplication.populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Leave application ${status} successfully!`,
      data: { leave: leaveApplication }
    });
  } catch (error) {
    console.error('Failed to update leave status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave application. Please try again',
      error: error.message
    });
  }
};

// Student can delete their own pending leave application
exports.deleteLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const studentId = req.user._id;

    // Find the leave application
    const leaveApplication = await Leave.findById(leaveId);
    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Make sure student can only delete their own application
    if (leaveApplication.user.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own leave applications'
      });
    }

    // Can only delete applications that are still pending
    if (leaveApplication.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a leave that is already approved or rejected'
      });
    }

    // Delete the application
    await Leave.findByIdAndDelete(leaveId);

    res.json({
      success: true,
      message: 'Leave application deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave application. Please try again',
      error: error.message
    });
  }
};
