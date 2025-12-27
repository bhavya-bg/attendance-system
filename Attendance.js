const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one attendance per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Ensure virtuals are included in JSON
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
