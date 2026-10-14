const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { verifyStudentAccess } = require('../middleware/studentAccessMiddleware');
const { validateObjectIds } = require('../utils/validateObjectId');

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Faculty / Admin
const createAttendance = async (req, res, next) => {
  try {
    const { studentId, subject, date, status } = req.body;

    // Validate studentId format
    if (!validateObjectIds(res, studentId)) return;

    // Check student existence
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Standardize date to day precision for accurate duplicate checking
    const recordDate = new Date(date);

    // Check for existing record for same (studentId, subject, date)
    const existing = await Attendance.findOne({
      studentId,
      subject,
      date: recordDate
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Attendance record already exists for this student, subject, and date'
      });
    }

    const attendance = await Attendance.create({
      studentId,
      subject,
      date: recordDate,
      status,
      recordedBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      data: {
        id: attendance._id,
        studentId: attendance.studentId,
        subject: attendance.subject,
        date: attendance.date,
        status: attendance.status
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance record already exists for this student, subject, and date'
      });
    }
    next(error);
  }
};

// @desc    Fetch attendance records for a student
// @route   GET /api/attendance/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
const getAttendanceByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const { subject, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { studentId };
    if (subject) query.subject = subject;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        records: records.map(r => ({
          id: r._id,
          subject: r.subject,
          date: r.date,
          status: r.status
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

// @desc    Get attendance stats for a student
// @route   GET /api/attendance/stats/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
const getAttendanceStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validateObjectIds(res, studentId)) return;
    const isAuthorized = await verifyStudentAccess(req, res, studentId);
    if (!isAuthorized) return;

    const records = await Attendance.find({ studentId });
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;

    const attendancePercentage = totalRecords > 0
      ? Number(((presentCount / totalRecords) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        studentId,
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        attendancePercentage
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch single attendance record by ID
// @route   GET /api/attendance/:id
// @access  Authenticated
const getAttendanceById = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Access check for student role
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
        date: record.date,
        status: record.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Faculty / Admin
const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectIds(res, id)) return;
    const { status, date } = req.body;

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (date) record.date = new Date(date);
    if (status) record.status = status;

    await record.save();

    return res.status(200).json({
      success: true,
      data: {
        id: record._id,
        studentId: record.studentId,
        subject: record.subject,
        date: record.date,
        status: record.status
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance record already exists for this student, subject, and date'
      });
    }
    next(error);
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Admin-only
const deleteAttendance = async (req, res, next) => {
  try {
    if (!validateObjectIds(res, req.params.id)) return;
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create attendance records
// @route   POST /api/attendance/bulk
// @access  Faculty / Admin
const bulkCreateAttendance = async (req, res, next) => {
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

        await Attendance.create({
          studentId: item.studentId,
          subject: item.subject,
          date: new Date(item.date),
          status: item.status,
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
  createAttendance,
  getAttendanceByStudent,
  getAttendanceStats,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  bulkCreateAttendance
};
