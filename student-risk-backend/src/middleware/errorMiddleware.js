const errorMiddleware = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';
  let errors = [];

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
    errors = [{ field, message: `${field} must be unique` }];
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors })
  });
};

module.exports = errorMiddleware;
