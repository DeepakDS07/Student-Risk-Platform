const Engagement = require('../models/Engagement');
const Student = require('../models/Student');
const { verifyStudentAccess } = require('../middleware/studentAccessMiddleware');
const { validateObjectIds } = require('../utils/validateObjectId');

// @desc    Create or update (upsert) engagement record
// @route   POST /api/engagement
// @access  Faculty / Admin
const createOrUpdateEngagement = async (req, res, next) => {
  try {
    const { studentId, period, loginCount, avgSubmissionDelayHours, participationScore } = req.body;

    if (!validateObjectIds(res, studentId)) return;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const existing = await Engagement.findOne({ studentId, period });

    if (existing) {
      if (loginCount !== undefined) existing.loginCount = Number(loginCount);
      if (avgSubmissionDelayHours !== undefined)
        existing.avgSubmissionDelayHours = Number(avgSubmissionDelayHours);
      if (participationScore !== undefined)
        existing.participationScore = Number(participationScore);

      await existing.save();

      return res.status(200).json({
        success: true,
        data: {
          id: existing._id,
          studentId: existing.studentId,
          period: existing.period,
          loginCount: existing.loginCount,
          avgSubmissionDelayHours: existing.avgSubmissionDelayHours,
          participationScore: existing.participationScore
        }
      });
    }

    const engagement = await Engagement.create({
      studentId,
      period,
      loginCount: loginCount !== undefined ? Number(loginCount) : 0,
      avgSubmissionDelayHours:
        avgSubmissionDelayHours !== undefined ? Number(avgSubmissionDelayHours) : 0,
      participationScore: participationScore !== undefined ? Number(participationScore) : 0
    });

    return res.status(201).json({
      success: true,
      data: {
        id: engagement._id,
        studentId: engagement.studentId,
        period: engagement.period,
        loginCount: engagement.loginCount,
        avgSubmissionDelayHours: engagement.avgSubmissionDelayHours,
        participationScore: engagement.participationScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch engagement records for a student
// @route   GET /api/engagement/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
const getEngagementByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const { startPeriod, endPeriod } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { studentId };
    if (startPeriod || endPeriod) {
      query.period = {};
      if (startPeriod) query.period.$gte = startPeriod;
      if (endPeriod) query.period.$lte = endPeriod;
    }

    const records = await Engagement.find(query)
      .sort({ period: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Engagement.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r._id,
          period: r.period,
          loginCount: r.loginCount,
          avgSubmissionDelayHours: r.avgSubmissionDelayHours,
          participationScore: r.participationScore
        })),
        total,
        page,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get engagement summary and trends for a student
// @route   GET /api/engagement/stats/student/:studentId
// @access  Authenticated
const getEngagementStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const records = await Engagement.find({ studentId }).sort({ period: 1 });

    if (records.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          studentId,
          latestPeriod: null,
          avgLoginCount: 0,
          avgSubmissionDelay: 0,
          avgParticipationScore: 0,
          trend: 'stable'
        }
      });
    }

    const latestPeriod = records[records.length - 1].period;
    const count = records.length;

    const avgLoginCount = Number(
      (records.reduce((sum, r) => sum + r.loginCount, 0) / count).toFixed(1)
    );
    const avgSubmissionDelay = Number(
      (records.reduce((sum, r) => sum + r.avgSubmissionDelayHours, 0) / count).toFixed(1)
    );
    const avgParticipationScore = Number(
      (records.reduce((sum, r) => sum + r.participationScore, 0) / count).toFixed(1)
    );

    // Calculate trend over time based on participation score
    let trend = 'stable';
    if (records.length >= 2) {
      const firstScore = records[0].participationScore;
      const lastScore = records[records.length - 1].participationScore;
      const diff = lastScore - firstScore;

      if (diff >= 5) {
        trend = 'improving';
      } else if (diff <= -5) {
        trend = 'declining';
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        latestPeriod,
        avgLoginCount,
        avgSubmissionDelay,
        avgParticipationScore,
        trend
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single engagement record
// @route   GET /api/engagement/:id
// @access  Authenticated
const getEngagementById = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Engagement.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Engagement record not found'
      });
    }

    if (req.user.role === 'student') {
      const isAuthorized = await verifyStudentAccess(req, res, record.studentId);
      if (!isAuthorized) return;
    }

    return res.status(200).json({
      success: true,
      data: {
        id: record._id,
        studentId: record.studentId,
        period: record.period,
        loginCount: record.loginCount,
        avgSubmissionDelayHours: record.avgSubmissionDelayHours,
        participationScore: record.participationScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update engagement record
// @route   PUT /api/engagement/:id
// @access  Faculty / Admin
const updateEngagement = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectIds(res, id)) return;
    const { loginCount, avgSubmissionDelayHours, participationScore } = req.body;

    const record = await Engagement.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Engagement record not found'
      });
    }

    if (loginCount !== undefined) record.loginCount = Number(loginCount);
    if (avgSubmissionDelayHours !== undefined)
      record.avgSubmissionDelayHours = Number(avgSubmissionDelayHours);
    if (participationScore !== undefined)
      record.participationScore = Number(participationScore);

    await record.save();

    return res.status(200).json({
      success: true,
      data: {
        id: record._id,
        studentId: record.studentId,
        period: record.period,
        loginCount: record.loginCount,
        avgSubmissionDelayHours: record.avgSubmissionDelayHours,
        participationScore: record.participationScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete engagement record
// @route   DELETE /api/engagement/:id
// @access  Admin-only
const deleteEngagement = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Engagement.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Engagement record not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Engagement record deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateEngagement,
  getEngagementByStudent,
  getEngagementStats,
  getEngagementById,
  updateEngagement,
  deleteEngagement
};
