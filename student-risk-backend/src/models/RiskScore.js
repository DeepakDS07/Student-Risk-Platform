const mongoose = require('mongoose');

const riskScoreSchema = new mongoose.Schema(
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
      default: 'overall',
      trim: true
    },
    score: {
      type: Number,
      required: [true, 'Risk score is required'],
      min: [0, 'Score must be between 0 and 100'],
      max: [100, 'Score must be between 0 and 100']
    },
    riskLevel: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Risk level must be low, medium, or high'
      },
      required: [true, 'Risk level is required']
    },
    contributingFactors: {
      type: [String],
      default: []
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    recommendation: {
      type: String,
      trim: true
    },
    computedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index to fetch latest score fast for a student per subject
riskScoreSchema.index({ studentId: 1, subject: 1, computedAt: -1 });

riskScoreSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const RiskScore = mongoose.model('RiskScore', riskScoreSchema);

module.exports = RiskScore;
