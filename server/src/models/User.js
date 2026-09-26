const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Do not return passwordHash in queries by default
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    profilePhoto: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Instance method to compare input password with stored hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Return user object without sensitive data
userSchema.methods.toAuthJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    profilePhoto: this.profilePhoto,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
