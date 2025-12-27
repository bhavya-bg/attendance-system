const User = require('../models/User');
const HodId = require('../models/HodId');
const jwt = require('jsonwebtoken');

// Create a login token for the user (like a temporary ID card that expires)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d' // Token valid for 7 days
  });
};

// Validate HOD ID - Check if it exists in ids collection
exports.validateHodId = async (req, res) => {
  try {
    const { hodId } = req.body;

    if (!hodId) {
      return res.status(400).json({
        success: false,
        message: 'HOD ID is required'
      });
    }

    // Check if HOD ID exists in ids collection
    const existingHodId = await HodId.findOne({ hodId: hodId.trim() });

    if (existingHodId) {
      // Check if already registered
      if (existingHodId.isRegistered) {
        return res.status(400).json({
          success: false,
          message: 'This HOD ID is already registered. Please login instead.',
          data: {
            valid: false,
            alreadyRegistered: true
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Valid HOD ID',
        data: {
          valid: true,
          department: existingHodId.department,
          alreadyRegistered: false
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Invalid HOD ID. Please contact admin for correct HOD ID.',
        data: {
          valid: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Handle new user registration (signup)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, department } = req.body;

    // Make sure user filled in all required fields - email and password for both roles
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email and password'
      });
    }

    // For students, name is required
    if (role === 'student' && !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name'
      });
    }

    // Validate role
    if (role && !['student', 'hod'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either student or hod'
      });
    }

    // Check required fields based on role
    if (role === 'student' && !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required for student registration'
      });
    }

    if (role === 'hod' && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for HOD registration'
      });
    }

    // For HOD registration, validate HOD ID and Department match
    if (role === 'hod') {
      const { hodId } = req.body;
      
      if (!hodId) {
        return res.status(400).json({
          success: false,
          message: 'HOD ID is required for HOD registration'
        });
      }

      // Check if HOD ID exists in ids collection
      const hodIdRecord = await HodId.findOne({ hodId: hodId.trim() });
      
      if (!hodIdRecord) {
        return res.status(400).json({
          success: false,
          message: 'HOD ID not found in database. Please contact admin for correct HOD ID.'
        });
      }

      // Check if HOD ID and Department match
      if (hodIdRecord.department !== department) {
        return res.status(400).json({
          success: false,
          message: 'HOD ID and Department do not match. Please check your details.'
        });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please use a different email.'
        });
      }

      // Save password to HodId collection
      hodIdRecord.password = password;
      hodIdRecord.isRegistered = true;
      await hodIdRecord.save();

      // Use predefined name from HodId collection
      const hodName = hodIdRecord.name || name || 'HOD';

      // Create new HOD user
      const newHOD = await User.create({
        name: hodName,
        email,
        password,
        role: 'hod',
        hodId: hodId.trim(),
        department
      });

      // Update registeredUserId in HodId collection
      hodIdRecord.registeredUserId = newHOD._id;
      await hodIdRecord.save();

      console.log('HOD Registration successful:', { 
        hodId: newHOD.hodId, 
        email: newHOD.email,
        role: newHOD.role,
        passwordSavedInIds: true
      });

      // Give them a login token
      const loginToken = generateToken(newHOD._id);

      return res.status(201).json({
        success: true,
        message: 'HOD account registered successfully! You can now login with your HOD ID.',
        data: {
          user: {
            id: newHOD._id,
            name: newHOD.name,
            email: newHOD.email,
            role: newHOD.role,
            hodId: newHOD.hodId,
            department: newHOD.department
          },
          token: loginToken
        }
      });
    }

    // Student registration - check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered. Please use a different email'
      });
    }

    // Prepare user data for student
    const userData = {
      name,
      email,
      password,
      role: role || 'student',
      rollNumber,
      department
    };
    
    // Create new student account in database
    const newUser = await User.create(userData);

    // Give them a login token so they're automatically logged in
    const loginToken = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'Student account created successfully!',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          hodId: newUser.hodId,
          rollNumber: newUser.rollNumber,
          department: newUser.department
        },
        token: loginToken
      }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    
    // Check if error is because email/roll number already exists
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${duplicateField} is already taken. Please use a different one`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again',
      error: error.message
    });
  }
};

// Handle user login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Make sure they entered both email/HOD ID and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email/HOD ID and password'
      });
    }

    // For HOD: login with HOD ID only
    // For Student: login with email
    let user;
    if (role === 'hod') {
      // HOD login - check password from HodId collection
      const hodIdToSearch = email.trim();
      const hodIdRecord = await HodId.findOne({ hodId: hodIdToSearch }).select('+password');
      
      console.log('HOD Login attempt:', { hodIdToSearch, hodIdRecordFound: !!hodIdRecord });
      
      if (!hodIdRecord || !hodIdRecord.password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid HOD ID or password'
        });
      }

      // Check if the password matches from HodId collection
      const isPasswordCorrect = await hodIdRecord.comparePassword(password);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: 'Invalid HOD ID or password'
        });
      }

      // Get user details from User collection
      user = await User.findOne({ hodId: hodIdToSearch, role: 'hod' });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid HOD ID or password'
        });
      }
    } else {
      // Student login - search by email
      user = await User.findOne({ email: email, role: 'student' }).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if the password matches
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    }

    // Give them a login token
    const loginToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful! Welcome back!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hodId: user.hodId,
          rollNumber: user.rollNumber,
          department: user.department
        },
        token: loginToken
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again',
      error: error.message
    });
  }
};

// Get logged-in user's profile information
exports.getMe = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: { user: currentUser }
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Could not load your profile. Please try again',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, department } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department) updateData.department = department;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again',
      error: error.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Failed to change password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password. Please try again',
      error: error.message
    });
  }
};
