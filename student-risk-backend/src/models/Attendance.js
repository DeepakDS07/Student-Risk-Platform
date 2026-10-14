const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      index: true
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent', 'late'],
        message: 'Status must be present, absent, or late'
      },
      required: [true, 'Attendance status is required']
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorded by user ID is required']
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate attendance logs on the same date for a student in a subject
attendanceSchema.index({ studentId: 1, subject: 1, date: 1 }, { unique: true });

attendanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
