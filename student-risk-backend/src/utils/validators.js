const { body, validationResult } = require('express-validator');

const validateCreateUser = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role')
    .trim()
    .isIn(['admin', 'faculty', 'mentor', 'student'])
    .withMessage('Role must be one of: admin, faculty, mentor, student'),
  body('department').optional().trim()
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = {
  validateCreateUser,
  validateLogin,
  handleValidationErrors
};
