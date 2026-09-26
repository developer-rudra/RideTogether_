const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateTokenAndSetCookie = require('../utils/generateToken');
const memoryStore = require('../services/memoryStore');

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists'
        });
      }

      const user = await User.create({
        name,
        email: cleanEmail,
        passwordHash: password,
        phone: phone || ''
      });

      const token = generateTokenAndSetCookie(res, user._id);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: user.toAuthJSON()
      });
    } else {
      // Memory fallback mode
      const userExists = await memoryStore.findUserByEmail(cleanEmail);
      if (userExists) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists'
        });
      }

      const user = await memoryStore.createUser({ name, email: cleanEmail, password, phone });
      const token = generateTokenAndSetCookie(res, user._id);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully (In-Memory mode)',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profilePhoto: user.profilePhoto
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both email and password'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      const token = generateTokenAndSetCookie(res, user._id);
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: user.toAuthJSON()
      });
    } else {
      const user = await memoryStore.findUserByEmail(cleanEmail);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      const token = generateTokenAndSetCookie(res, user._id);
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profilePhoto: user.profilePhoto
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.toAuthJSON ? req.user.toAuthJSON() : req.user
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe
};
