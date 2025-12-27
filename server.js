const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load our secret keys and settings from .env file
dotenv.config();

// Bring in all the route files that handle different features
const authRoutes = require('./routes/authRoutes'); // Login and signup
const attendanceRoutes = require('./routes/attendanceRoutes'); // Student attendance marking
const leaveRoutes = require('./routes/leaveRoutes'); // Leave applications
const hodRoutes = require('./routes/hodRoutes'); // HOD management

const app = express();

// Setup middleware - these help our server understand requests
// Allow requests from our React app (frontend)
app.use(cors({
  origin: ['http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Help server understand JSON data sent from frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Database connected successfully!'))
.catch((err) => {
  console.error('Failed to connect to database:', err.message);
  process.exit(1); // Stop the app if database won't connect
});

// Setup routes - different URLs for different features
app.use('/api/auth', authRoutes); // Handles login/signup
app.use('/api/attendance', attendanceRoutes); // Handles attendance marking
app.use('/api/leave', leaveRoutes); // Handles leave requests
app.use('/api/hod', hodRoutes); // Handles HOD management

// Simple route to check if server is working
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running perfectly!',
    timestamp: new Date().toISOString()
  });
});

// Catch and handle any errors that happen
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on our server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle requests to URLs that don't exist
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Page not found - this URL does not exist'
  });
});

// Start the server and make it listen for requests
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
