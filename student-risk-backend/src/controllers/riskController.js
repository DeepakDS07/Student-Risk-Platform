const RiskScore = require('../models/RiskScore');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assessment = require('../models/Assessment');
const { calculateStudentRisk } = require('../services/riskCalculationService');
const { verifyStudentAccess } = require('../middleware/studentAccessMiddleware');
const { validateObjectIds } = require('../utils/validateObjectId');

// @desc    Compute risk score for a student per subject
// @route   POST /api/risk/compute
// @access  Faculty / Admin
const computeRisk = async (req, res, next) => {
  try {
    const { studentId, subject } = req.body;

    if (!studentId || !subject) {
      return res.status(400).json({
        success: false,
        message: 'studentId and subject are required'
      });
    }

    if (!validateObjectIds(res, studentId)) return;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const riskRecord = await calculateStudentRisk(studentId, subject);

    return res.status(200).json({
      success: true,
      data: {
        riskId: riskRecord._id,
        studentId: riskRecord.studentId,
        subject: riskRecord.subject,
        score: riskRecord.score,
        riskLevel: riskRecord.riskLevel,
        contributingFactors: riskRecord.contributingFactors,
        details: riskRecord.details,
        computedAt: riskRecord.computedAt,
        recommendation: riskRecord.recommendation
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Fetch latest risk scores for a student across subjects
// @route   GET /api/risk/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
const getStudentRisk = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const { subject } = req.query;
    const query = { studentId };
    if (subject) query.subject = subject;

    // Fetch scores sorted by computedAt descending
    const scores = await RiskScore.find(query).sort({ computedAt: -1 });

    if (scores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No risk scores computed yet for this student'
      });
    }

    // Group by subject to get latest for each subject
    const latestBySubjectMap = new Map();
    for (const scoreDoc of scores) {
      if (!latestBySubjectMap.has(scoreDoc.subject)) {
        latestBySubjectMap.set(scoreDoc.subject, scoreDoc);
      }
    }

    const bySubject = Array.from(latestBySubjectMap.values()).map(doc => ({
      subject: doc.subject,
      score: doc.score,
      riskLevel: doc.riskLevel,
      factors: doc.contributingFactors,
      computedAt: doc.computedAt
    }));

    // Determine overall risk level across subjects
    let overallRisk = 'low';
    if (bySubject.some(s => s.riskLevel === 'high')) {
      overallRisk = 'high';
    } else if (bySubject.some(s => s.riskLevel === 'medium')) {
      overallRisk = 'medium';
    }

    const lastComputedAt = bySubject.length > 0 ? bySubject[0].computedAt : null;

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        overallRisk,
        lastComputedAt,
        bySubject
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch detailed risk breakdown for a student in one subject
// @route   GET /api/risk/student/:studentId/subject/:subject
// @access  Authenticated
const getStudentSubjectRiskDetail = async (req, res, next) => {
  try {
    const { studentId, subject } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const latestRisk = await RiskScore.findOne({ studentId, subject }).sort({ computedAt: -1 });

    if (!latestRisk) {
      // Attempt auto-compute if sufficient data exists
      try {
        const computed = await calculateStudentRisk(studentId, subject);
        return res.status(200).json({
          success: true,
          data: {
            riskId: computed._id,
            studentId: computed.studentId,
            subject: computed.subject,
            score: computed.score,
            riskLevel: computed.riskLevel,
            contributingFactors: computed.contributingFactors,
            details: computed.details,
            computedAt: computed.computedAt,
            recommendation: computed.recommendation
          }
        });
      } catch (err) {
        return res.status(404).json({
          success: false,
          message: 'No risk score found and insufficient data to compute'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        riskId: latestRisk._id,
        studentId: latestRisk.studentId,
        subject: latestRisk.subject,
        score: latestRisk.score,
        riskLevel: latestRisk.riskLevel,
        contributingFactors: latestRisk.contributingFactors,
        details: latestRisk.details,
        computedAt: latestRisk.computedAt,
        recommendation: latestRisk.recommendation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch class risk summary for faculty/admin dashboard
// @route   GET /api/risk/class/:classId
// @access  Faculty / Admin
const getClassRiskSummary = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { subject, riskLevel } = req.query;

    // Find students matching classId or department
    const query = {};
    if (classId && classId !== 'all') {
      query.department = classId;
    }

    const students = await Student.find(query).populate('userId', 'name email');
    const studentIds = students.map(s => s._id);

    const matchStage = { studentId: { $in: studentIds } };
    if (subject) matchStage.subject = subject;

    const latestScores = await RiskScore.find(matchStage).sort({ computedAt: -1 });

    const studentMap = new Map();
    for (const scoreDoc of latestScores) {
      const sId = scoreDoc.studentId.toString();
      if (!studentMap.has(sId)) {
        studentMap.set(sId, []);
      }
      studentMap.get(sId).push(scoreDoc);
    }

    const studentSummaries = [];
    const distribution = { high: 0, medium: 0, low: 0 };

    for (const student of students) {
      const sId = student._id.toString();
      const scores = studentMap.get(sId) || [];

      let studentOverallRisk = 'low';
      let subjects = [];
      let lastComputedAt = null;

      if (scores.length > 0) {
        if (scores.some((s) => s.riskLevel === 'high')) {
          studentOverallRisk = 'high';
        } else if (scores.some((s) => s.riskLevel === 'medium')) {
          studentOverallRisk = 'medium';
        }
        distribution[studentOverallRisk]++;
        subjects = scores.map((s) => s.subject);
        lastComputedAt = scores[0].computedAt;
      } else {
        // Students with pending data
        distribution['low']++;
      }

      if (!riskLevel || riskLevel === 'all' || riskLevel === studentOverallRisk) {
        studentSummaries.push({
          studentId: student._id,
          name: student.userId ? student.userId.name : 'Unknown',
          overallRisk: studentOverallRisk,
          subjects: subjects.length > 0 ? subjects : ['Pending Evaluation'],
          lastComputedAt
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        classId,
        total: studentSummaries.length,
        distribution,
        students: studentSummaries
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch compute risk for all students in a class or department
// @route   POST /api/risk/batch-compute
// @access  Admin-only
const batchComputeRisk = async (req, res, next) => {
  try {
    const { classId, department } = req.body;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Asynchronous background computation process
    setImmediate(async () => {
      try {
        const filter = {};
        if (department) filter.department = department;

        const students = await Student.find(filter);
        console.log(`[BatchJob ${jobId}] Processing risk scores for ${students.length} students...`);

        for (const student of students) {
          // Discover distinct subjects for student
          const subjects = await Attendance.distinct('subject', { studentId: student._id });
          const assessmentSubjects = await Assessment.distinct('subject', { studentId: student._id });
          const allSubjects = Array.from(new Set([...subjects, ...assessmentSubjects]));

          for (const sub of allSubjects) {
            try {
              await calculateStudentRisk(student._id, sub);
            } catch (err) {
              // Ignore insufficient data cases during batch run
            }
          }
        }
        console.log(`[BatchJob ${jobId}] Batch risk computation complete.`);
      } catch (err) {
        console.error(`[BatchJob ${jobId}] Error:`, err);
      }
    });

    return res.status(202).json({
      success: true,
      message: 'Batch computation started. This may take a few minutes.',
      jobId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  computeRisk,
  getStudentRisk,
  getStudentSubjectRiskDetail,
  getClassRiskSummary,
  batchComputeRisk
};
