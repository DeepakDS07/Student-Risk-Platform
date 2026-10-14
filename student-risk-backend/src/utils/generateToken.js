const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret_fallback';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      userId,
      role
    },
    secret,
    {
      expiresIn
    }
  );
};

module.exports = generateToken;
