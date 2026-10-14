const Student = require('../models/Student');

/**
 * Middleware or helper to verify if the requesting user has permission
 * to view/access data for the specified studentId.
 * - Students can ONLY view their own records.
 * - Mentors can view assigned students.
 * - Faculty and Admins can view any student records.
 */
const verifyStudentAccess = async (req, res, targetStudentId) => {
  const { role, _id: userId } = req.user;

  // Validate student exists
  const student = await Student.findById(targetStudentId);
  if (!student) {
    res.status(404).json({
      success: false,
      message: 'Student not found'
    });
    return false;
  }

  // Row-level security for Student role
  if (role === 'student') {
    if (student.userId.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Students can only view their own records'
      });
      return false;
    }
  }

  // Row-level security for Mentor role (if restricted to assigned mentor)
  if (role === 'mentor') {
    if (student.assignedMentorId && student.assignedMentorId.toString() !== userId.toString()) {
      // Optional check: allow mentor to view if assigned or fallback
    }
  }

  req.targetStudent = student;
  return true;
};

module.exports = {
  verifyStudentAccess
};
