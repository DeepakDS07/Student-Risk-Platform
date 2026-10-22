const express = require('express');
const router = express.Router();

const {
  computeRisk,
  getStudentRisk,
  getStudentSubjectRiskDetail,
  getClassRiskSummary,
  batchComputeRisk
} = require('../controllers/riskController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// @route   POST /api/risk/compute
// @access  Faculty / Admin
router.post(
  '/compute',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  computeRisk
);

// @route   POST /api/risk/batch-compute
// @access  Faculty / Admin
router.post(
  '/batch-compute',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  batchComputeRisk
);

// @route   GET /api/risk/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
router.get(
  '/student/:studentId',
  authMiddleware,
  getStudentRisk
);

// @route   GET /api/risk/student/:studentId/subject/:subject
// @access  Authenticated
router.get(
  '/student/:studentId/subject/:subject',
  authMiddleware,
  getStudentSubjectRiskDetail
);

// @route   GET /api/risk/class/:classId
// @access  Faculty / Admin
router.get(
  '/class/:classId',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  getClassRiskSummary
);

module.exports = router;
