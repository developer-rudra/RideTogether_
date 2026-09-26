const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const crypto = require('crypto');
const memoryStore = require('../services/memoryStore');

const generateRideCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

const createRide = async (req, res, next) => {
  try {
    const { name, startLocation, destination, description, scheduledStartTime } = req.body;

    if (!name || !startLocation || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Please provide ride name, start location, and destination'
      });
    }

    let rideCode = generateRideCode();

    const startLocObj = typeof startLocation === 'string'
      ? { address: startLocation, lat: 0, lng: 0 }
      : startLocation;

    const destObj = typeof destination === 'string'
      ? { address: destination, lat: 0, lng: 0 }
      : destination;

    if (mongoose.connection.readyState === 1) {
      let codeExists = await Ride.findOne({ rideCode });
      while (codeExists) {
        rideCode = generateRideCode();
        codeExists = await Ride.findOne({ rideCode });
      }

      const ride = await Ride.create({
        name,
        rideCode,
        createdBy: req.user._id,
        startLocation: startLocObj,
        destination: destObj,
        description: description || '',
        scheduledStartTime: scheduledStartTime || new Date(),
        status: 'UPCOMING',
        members: [
          {
            user: req.user._id,
            role: 'ADMIN',
            joinedAt: new Date()
          }
        ]
      });

      const populatedRide = await Ride.findById(ride._id)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      return res.status(201).json({
        success: true,
        message: 'Ride created successfully',
        ride: populatedRide
      });
    } else {
      const ride = await memoryStore.createRide({
        name,
        rideCode,
        createdBy: req.user._id,
        startLocation: startLocObj,
        destination: destObj,
        description,
        scheduledStartTime
      });

      return res.status(201).json({
        success: true,
        message: 'Ride created successfully (In-Memory)',
        ride
      });
    }
  } catch (error) {
    next(error);
  }
};

const joinRide = async (req, res, next) => {
  try {
    const { rideCode } = req.body;

    if (!rideCode) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid ride code'
      });
    }

    const cleanCode = rideCode.trim().toUpperCase();

    if (mongoose.connection.readyState === 1) {
      const ride = await Ride.findOne({ rideCode: cleanCode });
      if (!ride) {
        return res.status(404).json({ success: false, error: 'Ride not found. Check code.' });
      }

      if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
        return res.status(400).json({ success: false, error: `Cannot join ride: Status is ${ride.status}` });
      }

      const isAlreadyMember = ride.members.some(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (isAlreadyMember) {
        const populated = await Ride.findById(ride._id)
          .populate('createdBy', 'name email profilePhoto phone')
          .populate('members.user', 'name email profilePhoto phone');

        return res.status(200).json({ success: true, message: 'Already a member', ride: populated });
      }

      ride.members.push({ user: req.user._id, role: 'MEMBER', joinedAt: new Date() });
      await ride.save();

      const populatedRide = await Ride.findById(ride._id)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      return res.status(200).json({ success: true, message: 'Joined ride', ride: populatedRide });
    } else {
      const ride = await memoryStore.findRideByCode(cleanCode);
      if (!ride) {
        return res.status(404).json({ success: false, error: 'Ride not found. Check code.' });
      }

      const isAlreadyMember = ride.members.some(
        (m) => (m.user._id || m.user).toString() === req.user._id.toString()
      );

      if (!isAlreadyMember) {
        ride.members.push({
          user: { _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone },
          role: 'MEMBER',
          joinedAt: new Date().toISOString()
        });
      }

      return res.status(200).json({ success: true, message: 'Joined ride', ride });
    }
  } catch (error) {
    next(error);
  }
};

const getRideDetails = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const ride = await Ride.findById(rideId)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      if (!ride) {
        return res.status(404).json({ success: false, error: 'Ride not found' });
      }

      const isMember = ride.members.some(
        (m) => m.user._id.toString() === req.user._id.toString()
      );

      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      return res.status(200).json({ success: true, ride });
    } else {
      const ride = await memoryStore.findRideById(rideId);
      if (!ride) {
        return res.status(404).json({ success: false, error: 'Ride not found' });
      }
      return res.status(200).json({ success: true, ride });
    }
  } catch (error) {
    next(error);
  }
};

const getUserRides = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rides = await Ride.find({ 'members.user': req.user._id })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email profilePhoto')
        .populate('members.user', 'name email profilePhoto');

      const activeRides = rides.filter((r) => r.status === 'ACTIVE' || r.status === 'UPCOMING');
      const pastRides = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED');

      return res.status(200).json({ success: true, activeRides, pastRides, totalCount: rides.length });
    } else {
      const rides = await memoryStore.findRidesByUserId(req.user._id);
      const activeRides = rides.filter((r) => r.status === 'ACTIVE' || r.status === 'UPCOMING');
      const pastRides = rides.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED');

      return res.status(200).json({ success: true, activeRides, pastRides, totalCount: rides.length });
    }
  } catch (error) {
    next(error);
  }
};

const startRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const ride = await Ride.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.status = 'ACTIVE';
      ride.startedAt = new Date();
      await ride.save();

      const populated = await Ride.findById(ride._id)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      return res.status(200).json({ success: true, message: 'Ride started', ride: populated });
    } else {
      const ride = await memoryStore.findRideById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.status = 'ACTIVE';
      ride.startedAt = new Date().toISOString();
      return res.status(200).json({ success: true, message: 'Ride started', ride });
    }
  } catch (error) {
    next(error);
  }
};

const endRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const ride = await Ride.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.status = 'COMPLETED';
      ride.endedAt = new Date();
      await ride.save();

      const populated = await Ride.findById(ride._id)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      return res.status(200).json({ success: true, message: 'Ride ended', ride: populated });
    } else {
      const ride = await memoryStore.findRideById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.status = 'COMPLETED';
      ride.endedAt = new Date().toISOString();
      return res.status(200).json({ success: true, message: 'Ride ended', ride });
    }
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { rideId, userId } = req.params;
    if (mongoose.connection.readyState === 1) {
      const ride = await Ride.findById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.members = ride.members.filter((m) => m.user.toString() !== userId);
      await ride.save();

      const populated = await Ride.findById(ride._id)
        .populate('createdBy', 'name email profilePhoto phone')
        .populate('members.user', 'name email profilePhoto phone');

      return res.status(200).json({ success: true, message: 'Member removed', ride: populated });
    } else {
      const ride = await memoryStore.findRideById(rideId);
      if (!ride) return res.status(404).json({ success: false, error: 'Ride not found' });

      ride.members = ride.members.filter((m) => (m.user._id || m.user).toString() !== userId);
      return res.status(200).json({ success: true, message: 'Member removed', ride });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRide,
  joinRide,
  getRideDetails,
  getUserRides,
  startRide,
  endRide,
  removeMember
};
