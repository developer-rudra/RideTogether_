const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const memoryStore = require('../services/memoryStore');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token provided'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'ridetogether_fallback_secret_key';
    const decoded = jwt.verify(token, secret);

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select('-passwordHash');
    } else {
      const rawUser = await memoryStore.findUserById(decoded.id);
      if (rawUser) {
        user = {
          _id: rawUser._id,
          name: rawUser.name,
          email: rawUser.email,
          phone: rawUser.phone,
          profilePhoto: rawUser.profilePhoto,
          toAuthJSON: () => ({
            _id: rawUser._id,
            name: rawUser.name,
            email: rawUser.email,
            phone: rawUser.phone,
            profilePhoto: rawUser.profilePhoto
          })
        };
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User session expired or user no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error.message);
    return res.status(401).json({
      success: false,
      error: 'Not authorized, token invalid'
    });
  }
};

module.exports = { protect };
