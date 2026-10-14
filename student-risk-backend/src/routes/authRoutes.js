const express = require('express');
const router = express.Router();

const {
  createUser,
  login,
  getMe,
  logout
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  validateCreateUser,
  validateLogin,
  handleValidationErrors
} = require('../utils/validators');

// @route   POST /api/auth/create-user
// @access  Admin-only
router.post(
  '/create-user',
  authMiddleware,
  roleMiddleware('admin'),
  validateCreateUser,
  handleValidationErrors,
  createUser
);

// @route   POST /api/auth/login
// @access  Public
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  login
);

// @route   GET /api/auth/me
// @access  Authenticated
router.get(
  '/me',
  authMiddleware,
  getMe
);

// @route   POST /api/auth/logout
// @access  Authenticated
router.post(
  '/logout',
  authMiddleware,
  logout
);

module.exports = router;
