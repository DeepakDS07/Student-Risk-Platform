const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const { verifyStudentAccess } = require('../middleware/studentAccessMiddleware');
const { validateObjectIds } = require('../utils/validateObjectId');

// @desc    Create assessment record
// @route   POST /api/assessment
// @access  Faculty / Admin
const createAssessment = async (req, res, next) => {
  try {
    const { studentId, subject, type, marksObtained, maxMarks, date } = req.body;

    if (!validateObjectIds(res, studentId)) return;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const assessment = await Assessment.create({
      studentId,
      subject,
      type,
      marksObtained: Number(marksObtained),
      maxMarks: Number(maxMarks),
      date: new Date(date),
      recordedBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      data: {
        id: assessment._id,
        studentId: assessment.studentId,
        subject: assessment.subject,
        type: assessment.type,
        marksObtained: assessment.marksObtained,
        maxMarks: assessment.maxMarks,
        date: assessment.date
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch assessments for a student
// @route   GET /api/assessment/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
const getAssessmentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const { subject, type, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { studentId };
    if (subject) query.subject = subject;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Assessment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Assessment.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r._id,
          subject: r.subject,
          type: r.type,
          marksObtained: r.marksObtained,
          maxMarks: r.maxMarks,
          date: r.date
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

// @desc    Get average marks and marks trend for a student
// @route   GET /api/assessment/stats/student/:studentId
// @access  Authenticated
const getAssessmentStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const records = await Assessment.find({ studentId });
    const totalAssessments = records.length;

    if (totalAssessments === 0) {
      return res.status(200).json({
        success: true,
        data: {
          studentId,
          totalAssessments: 0,
          averageMarks: 0,
          marksRange: { min: 0, max: 0 },
          byType: {
            internal: { count: 0, average: 0 },
            assignment: { count: 0, average: 0 },
            semester: { count: 0, average: 0 }
          }
        }
      });
    }

    const percentages = records.map(r => (r.marksObtained / r.maxMarks) * 100);
    const averageMarks = Number(
      (percentages.reduce((sum, p) => sum + p, 0) / totalAssessments).toFixed(1)
    );
    const minMarks = Number(Math.min(...percentages).toFixed(1));
    const maxMarksVal = Number(Math.max(...percentages).toFixed(1));

    const computeTypeStats = (typeName) => {
      const filtered = records.filter(r => r.type === typeName);
      if (filtered.length === 0) return { count: 0, average: 0 };
      const avg =
        filtered.reduce((sum, r) => sum + (r.marksObtained / r.maxMarks) * 100, 0) /
        filtered.length;
      return { count: filtered.length, average: Number(avg.toFixed(1)) };
    };

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        totalAssessments,
        averageMarks,
        marksRange: { min: minMarks, max: maxMarksVal },
        byType: {
          internal: computeTypeStats('internal'),
          assignment: computeTypeStats('assignment'),
          semester: computeTypeStats('semester')
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single assessment record
// @route   GET /api/assessment/:id
// @access  Authenticated
const getAssessmentById = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Assessment.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Assessment record not found'
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
        subject: record.subject,
        type: record.type,
        marksObtained: record.marksObtained,
        maxMarks: record.maxMarks,
        date: record.date
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update assessment record
// @route   PUT /api/assessment/:id
// @access  Faculty / Admin
const updateAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectIds(res, id)) return;
    const { marksObtained, maxMarks, type, date, subject } = req.body;

    const record = await Assessment.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Assessment record not found'
      });
    }

    const updatedMaxMarks = maxMarks !== undefined ? Number(maxMarks) : record.maxMarks;
    const updatedMarksObtained =
      marksObtained !== undefined ? Number(marksObtained) : record.marksObtained;

    if (updatedMarksObtained > updatedMaxMarks) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: [{ field: 'marksObtained', message: 'marksObtained cannot exceed maxMarks' }]
      });
    }

    if (subject) record.subject = subject;
    if (type) record.type = type;
    if (date) record.date = new Date(date);
    record.maxMarks = updatedMaxMarks;
    record.marksObtained = updatedMarksObtained;

    await record.save();

    return res.status(200).json({
      success: true,
      data: {
        id: record._id,
        studentId: record.studentId,
        subject: record.subject,
        type: record.type,
        marksObtained: record.marksObtained,
        maxMarks: record.maxMarks,
        date: record.date
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete assessment record
// @route   DELETE /api/assessment/:id
// @access  Admin-only
const deleteAssessment = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Assessment.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Assessment record not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment record deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create assessment records
// @route   POST /api/assessment/bulk
// @access  Faculty / Admin
const bulkCreateAssessment = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.records || [];
    let created = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const student = await Student.findById(item.studentId);
        if (!student) {
          failed++;
          errors.push({ index: i, message: `Student ${item.studentId} not found` });
          continue;
        }

        if (Number(item.marksObtained) > Number(item.maxMarks)) {
          failed++;
          errors.push({ index: i, message: 'marksObtained exceeds maxMarks' });
          continue;
        }

        await Assessment.create({
          studentId: item.studentId,
          subject: item.subject,
          type: item.type,
          marksObtained: Number(item.marksObtained),
          maxMarks: Number(item.maxMarks),
          date: new Date(item.date),
          recordedBy: req.user._id
        });
        created++;
      } catch (err) {
        failed++;
        errors.push({ index: i, message: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        created,
        failed,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssessment,
  getAssessmentsByStudent,
  getAssessmentStats,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  bulkCreateAssessment
};
