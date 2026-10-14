const express = require('express');
const router = express.Router();

const {
  createAttendance,
  getAttendanceByStudent,
  getAttendanceStats,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  bulkCreateAttendance
} = require('../controllers/attendanceController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  validateCreateAttendance,
  validateUpdateAttendance,
  handleDataValidationErrors
} = require('../utils/dataValidators');

// @route   POST /api/attendance
// @access  Faculty / Admin
router.post(
  '/',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateCreateAttendance,
  handleDataValidationErrors,
  createAttendance
);

// @route   POST /api/attendance/bulk
// @access  Faculty / Admin
router.post(
  '/bulk',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  bulkCreateAttendance
);

// @route   GET /api/attendance/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
router.get(
  '/student/:studentId',
  authMiddleware,
  getAttendanceByStudent
);

// @route   GET /api/attendance/stats/student/:studentId
// @access  Authenticated
router.get(
  '/stats/student/:studentId',
  authMiddleware,
  getAttendanceStats
);

// @route   GET /api/attendance/:id
// @access  Authenticated
router.get(
  '/:id',
  authMiddleware,
  getAttendanceById
);

// @route   PUT /api/attendance/:id
// @access  Faculty / Admin
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateUpdateAttendance,
  handleDataValidationErrors,
  updateAttendance
);

// @route   DELETE /api/attendance/:id
// @access  Admin-only
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  deleteAttendance
);

module.exports = router;
