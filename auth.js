const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Check if user is logged in (verify their login token)
exports.authenticate = async (req, res, next) => {
  try {
    // Get the login token from request header
    const authHeader = req.headers.authorization;
    
    // Make sure token is provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please log in first. No login token found'
      });
    }

    // Extract the actual token (remove "Bearer " prefix)
    const loginToken = authHeader.split(' ')[1];

    // Verify if the token is valid and not tampered with
    const decodedToken = jwt.verify(loginToken, process.env.JWT_SECRET);

    // Get user details from database using token info
    const currentUser = await User.findById(decodedToken.id).select('-password');
    
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login token. User not found'
      });
    }

    // Save user info in request so other functions can use it
    req.user = currentUser;
    next(); // Continue to next function
  } catch (error) {
    // Handle different types of token errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid login token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Something went wrong while checking login'
    });
  }
};

// Check if user has permission (admin or student)
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Make sure user is logged in first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please log in first'
      });
    }

    // Check if user's role matches the required roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You need to be ${allowedRoles.join(' or ')} to access this`
      });
    }

    next(); // User has permission, continue
  };
};

// Make sure students can only access their own data (not other students' data)
exports.verifyOwnership = (DatabaseModel) => {
  return async (req, res, next) => {
    try {
      const itemId = req.params.id;
      const item = await DatabaseModel.findById(itemId);

      // Check if the item exists
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      // HOD can access everything
      if (req.user.role === 'hod') {
        req.resource = item;
        return next();
      }

      // Students can only access their own items
      if (item.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own data'
        });
      }

      req.resource = item;
      next(); // User owns this item, allow access
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Something went wrong while checking ownership'
      });
    }
  };
};
