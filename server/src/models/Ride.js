const mongoose = require('mongoose');

const rideMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'MEMBER'],
    default: 'MEMBER'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const rideSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a ride name'],
      trim: true,
      maxlength: [100, 'Ride name cannot exceed 100 characters']
    },
    rideCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startLocation: {
      address: { type: String, required: true, trim: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    destination: {
      address: { type: String, required: true, trim: true },
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledStartTime: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING'
    },
    members: [rideMemberSchema],
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Index for finding user rides efficiently
rideSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Ride', rideSchema);
