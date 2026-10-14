const mongoose = require('mongoose');

const engagementSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      index: true
    },
    period: {
      type: String,
      required: [true, 'Period is required'],
      trim: true
    },
    loginCount: {
      type: Number,
      default: 0,
      min: 0
    },
    avgSubmissionDelayHours: {
      type: Number,
      default: 0,
      min: 0
    },
    participationScore: {
      type: Number,
      default: 0,
      min: [0, 'Participation score must be between 0 and 100'],
      max: [100, 'Participation score must be between 0 and 100']
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index to ensure one engagement record per student per period
engagementSchema.index({ studentId: 1, period: 1 }, { unique: true });

engagementSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Engagement = mongoose.model('Engagement', engagementSchema);

module.exports = Engagement;
