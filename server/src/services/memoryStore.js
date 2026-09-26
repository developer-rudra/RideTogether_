const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * In-memory fallback data store for development & testing environments
 * when MongoDB daemon is not running locally.
 */
class MemoryStore {
  constructor() {
    this.users = new Map(); // Map<id, user>
    this.rides = new Map(); // Map<id, ride>
  }

  // USER METHODS
  async createUser({ name, email, password, phone }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    const user = {
      _id: id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      profilePhoto: '',
      createdAt: new Date().toISOString()
    };

    this.users.set(id, user);
    return user;
  }

  async findUserByEmail(email) {
    for (const u of this.users.values()) {
      if (u.email === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  async findUserById(id) {
    return this.users.get(id.toString()) || null;
  }

  // RIDE METHODS
  async createRide({ name, rideCode, createdBy, startLocation, destination, description, scheduledStartTime }) {
    const id = crypto.randomUUID();
    const creator = await this.findUserById(createdBy);

    const ride = {
      _id: id,
      name,
      rideCode,
      createdBy: creator ? { _id: creator._id, name: creator.name, email: creator.email, phone: creator.phone } : createdBy,
      startLocation,
      destination,
      description: description || '',
      scheduledStartTime: scheduledStartTime || new Date().toISOString(),
      status: 'UPCOMING',
      members: [
        {
          user: creator ? { _id: creator._id, name: creator.name, email: creator.email, phone: creator.phone } : createdBy,
          role: 'ADMIN',
          joinedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.rides.set(id, ride);
    return ride;
  }

  async findRideByCode(code) {
    for (const r of this.rides.values()) {
      if (r.rideCode === code.toUpperCase()) {
        return r;
      }
    }
    return null;
  }

  async findRideById(id) {
    return this.rides.get(id.toString()) || null;
  }

  async findRidesByUserId(userId) {
    const list = [];
    for (const r of this.rides.values()) {
      const isMem = r.members.some(m => (m.user._id || m.user).toString() === userId.toString());
      if (isMem) {
        list.push(r);
      }
    }
    return list;
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;
