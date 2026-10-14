const mongoose = require('mongoose');

/**
 * Validates one or more MongoDB ObjectIds and returns a 400 response if any is invalid.
 * Usage: if (!validateObjectIds(res, req.params.studentId)) return;
 *        if (!validateObjectIds(res, req.params.studentId, req.params.otherId)) return;
 *
 * @param {Response} res  - Express response object
 * @param {...string} ids - One or more ID strings to validate
 * @returns {boolean}     - true if all valid, false if response already sent
 */
const validateObjectIds = (res, ...ids) => {
  for (const id of ids) {
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: `Invalid ID format: "${id}" is not a valid MongoDB ObjectId`
      });
      return false;
    }
  }
  return true;
};

module.exports = { validateObjectIds };
