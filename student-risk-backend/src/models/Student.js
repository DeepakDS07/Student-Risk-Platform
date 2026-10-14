const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true
    },
    batch: {
      type: String,
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required']
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    assignedMentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
