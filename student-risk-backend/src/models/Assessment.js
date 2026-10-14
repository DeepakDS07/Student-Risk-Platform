const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: {
        values: ['internal', 'assignment', 'semester'],
        message: 'Assessment type must be internal, assignment, or semester'
      },
      required: [true, 'Assessment type is required']
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: [0, 'Marks obtained cannot be negative']
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [1, 'Max marks must be greater than 0']
    },
    date: {
      type: Date,
      required: [true, 'Date is required']
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

// Compound index for efficient querying by student, subject, and date
assessmentSchema.index({ studentId: 1, subject: 1, date: 1 });

assessmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
