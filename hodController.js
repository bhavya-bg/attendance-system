const User = require('../models/User');

// Create a new HOD account (Admin only)
exports.createHOD = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    // Create HOD account
    const hodData = {
      name,
      email,
      password,
      role: 'hod',
      department: department || 'Not Assigned'
    };

    const newHOD = await User.create(hodData);

    res.status(201).json({
      success: true,
      message: 'HOD account created successfully!',
      data: {
        hod: {
          id: newHOD._id,
          name: newHOD.name,
          email: newHOD.email,
          role: newHOD.role,
          department: newHOD.department
        }
      }
    });
  } catch (error) {
    console.error('Failed to create HOD:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create HOD account',
      error: error.message
    });
  }
};

// Get all HODs
exports.getAllHODs = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod' }).select('-password');

    res.json({
      success: true,
      count: hods.length,
      data: { hods }
    });
  } catch (error) {
    console.error('Failed to fetch HODs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HODs',
      error: error.message
    });
  }
};

// Update HOD details
exports.updateHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department } = req.body;

    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({
        success: false,
        message: 'HOD not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== hod.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use'
        });
      }
    }

    // Update fields
    if (name) hod.name = name;
    if (email) hod.email = email;
    if (department) hod.department = department;

    await hod.save();

    res.json({
      success: true,
      message: 'HOD updated successfully',
      data: {
        hod: {
          id: hod._id,
          name: hod.name,
          email: hod.email,
          department: hod.department,
          role: hod.role
        }
      }
    });
  } catch (error) {
    console.error('Failed to update HOD:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update HOD',
      error: error.message
    });
  }
};

// Delete HOD account
exports.deleteHOD = async (req, res) => {
  try {
    const { id } = req.params;

    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({
        success: false,
        message: 'HOD not found'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'HOD account deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete HOD:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete HOD',
      error: error.message
    });
  }
};

// Reset HOD password
exports.resetHODPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({
        success: false,
        message: 'HOD not found'
      });
    }

    hod.password = newPassword;
    await hod.save();

    res.json({
      success: true,
      message: 'HOD password reset successfully'
    });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};
