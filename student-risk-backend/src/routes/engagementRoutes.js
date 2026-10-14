const express = require('express');
const router = express.Router();

const {
  createOrUpdateEngagement,
  getEngagementByStudent,
  getEngagementStats,
  getEngagementById,
  updateEngagement,
  deleteEngagement
} = require('../controllers/engagementController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  validateCreateEngagement,
  validateUpdateEngagement,
  handleDataValidationErrors
} = require('../utils/dataValidators');

// @route   POST /api/engagement
// @access  Faculty / Admin
router.post(
  '/',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateCreateEngagement,
  handleDataValidationErrors,
  createOrUpdateEngagement
);

// @route   GET /api/engagement/student/:studentId
// @access  Authenticated (Student: own data; Faculty/Mentor/Admin: unrestricted)
router.get(
  '/student/:studentId',
  authMiddleware,
  getEngagementByStudent
);

// @route   GET /api/engagement/stats/student/:studentId
// @access  Authenticated
router.get(
  '/stats/student/:studentId',
  authMiddleware,
  getEngagementStats
);

// @route   GET /api/engagement/:id
// @access  Authenticated
router.get(
  '/:id',
  authMiddleware,
  getEngagementById
);

// @route   PUT /api/engagement/:id
// @access  Faculty / Admin
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('faculty', 'admin'),
  validateUpdateEngagement,
  handleDataValidationErrors,
  updateEngagement
);

// @route   DELETE /api/engagement/:id
// @access  Admin-only
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  deleteEngagement
);

module.exports = router;
