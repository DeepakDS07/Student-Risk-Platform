const User = require('../models/User');
const Student = require('../models/Student');
const RiskScore = require('../models/RiskScore');

// @desc    Get all users list (for admin dashboard & mentor selection)
// @route   GET /api/users
// @access  Authenticated
const getUsers = async (req, res, next) => {
  try {
    const { role, department } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of all students with linked profile, mentor info, and computed risk level
// @route   GET /api/users/students
// @access  Authenticated (Faculty / Mentor / Admin)
const getStudentsList = async (req, res, next) => {
  try {
    const { mentorId, department } = req.query;

    // Auto-sync: ensure every User with role='student' has a Student record
    const studentUsers = await User.find({ role: 'student' });
    const existingStudents = await Student.find({}, 'userId');
    const existingUserIds = new Set(existingStudents.map((s) => s.userId?.toString()));

    for (const u of studentUsers) {
      if (!existingUserIds.has(u._id.toString())) {
        const year = new Date(u.createdAt || Date.now()).getFullYear();
        const deptPrefix = (u.department && u.department.toLowerCase().includes('info')) ? 'IT' : 'CS';
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const rollNumber = `${deptPrefix}${year}${randomSuffix}`;

        try {
          await Student.create({
            userId: u._id,
            rollNumber,
            batch: String(year),
            semester: 1,
            department: u.department || 'Computer Science'
          });
        } catch (err) {
          console.error('Error auto-creating Student profile:', err.message);
        }
      }
    }

    const filter = {};
    if (mentorId) filter.assignedMentorId = mentorId;
    if (department && department !== 'all') filter.department = department;

    const students = await Student.find(filter)
      .populate('userId', 'name email department isActive')
      .populate('assignedMentorId', 'name email');

    // Attach latest overall risk score for each student
    const studentIds = students.map((s) => s._id);
    const riskScores = await RiskScore.find({ studentId: { $in: studentIds } }).sort({ computedAt: -1 });

    const riskMap = {};
    for (const r of riskScores) {
      const sId = r.studentId.toString();
      if (!riskMap[sId]) {
        riskMap[sId] = { high: false, medium: false, low: false, highestScore: 0, latestFactors: [] };
      }
      if (r.riskLevel === 'high') riskMap[sId].high = true;
      if (r.riskLevel === 'medium') riskMap[sId].medium = true;
      if (r.riskLevel === 'low') riskMap[sId].low = true;
      if (r.score > riskMap[sId].highestScore) riskMap[sId].highestScore = r.score;
      if (r.contributingFactors?.length) riskMap[sId].latestFactors = r.contributingFactors;
    }

    const studentsWithRisk = students.map((s) => {
      const obj = s.toObject();
      const r = riskMap[s._id.toString()];
      let overallRisk = 'low';
      if (r?.high) overallRisk = 'high';
      else if (r?.medium) overallRisk = 'medium';

      obj.overallRisk = overallRisk;
      obj.highestRiskScore = r?.highestScore || 0;
      obj.warningFactors = r?.latestFactors || [];
      return obj;
    });

    return res.status(200).json({
      success: true,
      data: studentsWithRisk
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or update mentor for a student
// @route   PUT /api/users/students/:id/mentor
// @access  Admin or Faculty
const updateStudentMentor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mentorId } = req.body;

    let student = await Student.findById(id);
    if (!student) {
      student = await Student.findOne({ userId: id });
    }

    if (!student) {
      const user = await User.findById(id);
      if (user && user.role === 'student') {
        const year = new Date().getFullYear();
        const deptPrefix = (user.department && user.department.toLowerCase().includes('info')) ? 'IT' : 'CS';
        student = await Student.create({
          userId: user._id,
          rollNumber: `${deptPrefix}${year}${Math.floor(1000 + Math.random() * 9000)}`,
          batch: String(year),
          semester: 1,
          department: user.department || 'Computer Science'
        });
      }
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    if (mentorId) {
      const mentorUser = await User.findById(mentorId);
      if (!mentorUser) {
        return res.status(404).json({
          success: false,
          message: 'Mentor user not found'
        });
      }
      student.assignedMentorId = mentorId;
    } else {
      student.assignedMentorId = undefined;
    }

    await student.save();
    await student.populate('assignedMentorId', 'name email');
    await student.populate('userId', 'name email department isActive');

    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/users/:id/status
// @access  Admin-only
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    } else {
      user.isActive = !user.isActive;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getStudentsList,
  toggleUserStatus,
  updateStudentMentor
};
