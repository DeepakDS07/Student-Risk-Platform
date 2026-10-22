const { body, param, query, validationResult } = require('express-validator');

// Helper to check if a date is not in the future
const isNotInFuture = (value) => {
  const inputDate = new Date(value);
  if (isNaN(inputDate.getTime())) {
    throw new Error('Invalid date format');
  }
  const now = new Date();
  if (inputDate > now) {
    throw new Error('Date cannot be in the future');
  }
  return true;
};

// Attendance Validators
const validateCreateAttendance = [
  body('studentId').isMongoId().withMessage('Valid studentId is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('date').isISO8601().withMessage('Valid date in ISO 8601 format is required').custom(isNotInFuture),
  body('status')
    .trim()
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late')
];

const validateUpdateAttendance = [
  body('status')
    .optional()
    .trim()
    .isIn(['present', 'absent', 'late'])
    .withMessage('Status must be present, absent, or late'),
  body('date').optional().isISO8601().withMessage('Valid date is required').custom(isNotInFuture)
];

// Assessment Validators
const validateCreateAssessment = [
  body('studentId').isMongoId().withMessage('Valid studentId is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('type')
    .trim()
    .isIn(['ut1', 'ut2', 'cat1', 'cat2', 'semester', 'internal', 'assignment'])
    .withMessage('Type must be ut1, ut2, cat1, cat2, semester, internal, or assignment'),
  body('maxMarks')
    .isFloat({ min: 0.1 })
    .withMessage('maxMarks must be a positive number greater than 0'),
  body('marksObtained')
    .isFloat({ min: 0 })
    .withMessage('marksObtained must be a non-negative number')
    .custom((value, { req }) => {
      if (req.body.maxMarks !== undefined && value > Number(req.body.maxMarks)) {
        throw new Error('marksObtained cannot exceed maxMarks');
      }
      return true;
    }),
  body('date').isISO8601().withMessage('Valid date in ISO 8601 format is required').custom(isNotInFuture)
];

const validateUpdateAssessment = [
  body('type')
    .optional()
    .trim()
    .isIn(['ut1', 'ut2', 'cat1', 'cat2', 'semester', 'internal', 'assignment'])
    .withMessage('Type must be ut1, ut2, cat1, cat2, semester, internal, or assignment'),
  body('maxMarks')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('maxMarks must be greater than 0'),
  body('marksObtained')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('marksObtained must be a non-negative number')
    .custom((value, { req }) => {
      if (req.body.maxMarks !== undefined && value > Number(req.body.maxMarks)) {
        throw new Error('marksObtained cannot exceed maxMarks');
      }
      return true;
    }),
  body('date').optional().isISO8601().withMessage('Valid date is required').custom(isNotInFuture)
];

// Engagement Validators
const validateCreateEngagement = [
  body('studentId').isMongoId().withMessage('Valid studentId is required'),
  body('period')
    .trim()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Period must be in YYYY-MM format (e.g. 2026-09)'),
  body('loginCount').optional().isInt({ min: 0 }).withMessage('loginCount must be a non-negative integer'),
  body('avgSubmissionDelayHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('avgSubmissionDelayHours must be a non-negative number'),
  body('participationScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('participationScore must be between 0 and 100')
];

const validateUpdateEngagement = [
  body('loginCount').optional().isInt({ min: 0 }).withMessage('loginCount must be a non-negative integer'),
  body('avgSubmissionDelayHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('avgSubmissionDelayHours must be a non-negative number'),
  body('participationScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('participationScore must be between 0 and 100')
];

// Common Validation Error Handler Middleware
const handleDataValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = {
  validateCreateAttendance,
  validateUpdateAttendance,
  validateCreateAssessment,
  validateUpdateAssessment,
  validateCreateEngagement,
  validateUpdateEngagement,
  handleDataValidationErrors
};
