const mongoose = require('mongoose');

const interventionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      index: true
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor ID is required']
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['open', 'in-progress', 'resolved'],
        message: 'Status must be open, in-progress, or resolved'
      },
      default: 'open'
    }
  },
  {
    timestamps: true
  }
);

interventionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Intervention = mongoose.model('Intervention', interventionSchema);

module.exports = Intervention;
