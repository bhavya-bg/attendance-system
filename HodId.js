const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hodIdSchema = new mongoose.Schema({
  hodId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  registeredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
hodIdSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
hodIdSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('HodId', hodIdSchema, 'ids');
