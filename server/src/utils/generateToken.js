const jwt = require('jsonwebtoken');

/**
 * Generates JWT token and attaches HTTP-only cookie to response
 * @param {Object} res - Express response object
 * @param {string} userId - User ID string
 * @returns {string} token
 */
const generateTokenAndSetCookie = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'ridetogether_fallback_secret_key';
  const token = jwt.sign({ id: userId }, secret, {
    expiresIn: '7d'
  });

  // Set HTTP-only Cookie
  res.cookie('jwt', token, {
    httpOnly: true, // Prevents XSS attacks from reading cookie
    secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
    sameSite: 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
};

module.exports = generateTokenAndSetCookie;
