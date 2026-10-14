const express = require('express');
const router = express.Router();

const {
  createAssessment,
  getAssessmentsByStudent,
  getAssessmentStats,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  bulkCreateAssessment
} = require('../controllers/assessmentController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  validateCreateAssessment,
  validateUpdateAssessment,
  handleDataValidationErrors
} = require('../utils/dataValidators');

// @route   POST /api/assessment
// @access  Faculty / Admin
router.post(
  '/',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateCreateAssessment,
  handleDataValidationErrors,
  createAssessment
);

// @route   POST /api/assessment/bulk
// @access  Faculty / Admin
router.post(
  '/bulk',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  bulkCreateAssessment
);

// @route   GET /api/assessment/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
router.get(
  '/student/:studentId',
  authMiddleware,
  getAssessmentsByStudent
);

// @route   GET /api/assessment/stats/student/:studentId
// @access  Authenticated
router.get(
  '/stats/student/:studentId',
  authMiddleware,
  getAssessmentStats
);

// @route   GET /api/assessment/:id
// @access  Authenticated
router.get(
  '/:id',
  authMiddleware,
  getAssessmentById
);

// @route   PUT /api/assessment/:id
// @access  Faculty / Admin
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateUpdateAssessment,
  handleDataValidationErrors,
  updateAssessment
);

// @route   DELETE /api/assessment/:id
// @access  Admin-only
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  deleteAssessment
);

module.exports = router;
