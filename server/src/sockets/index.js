const Ride = require('../models/Ride');

/**
 * Socket.IO server event handlers.
 * Realtime state is maintained in-memory for active ride rooms.
 */
const initSocketServer = (io) => {
  // In-memory store for rider live state per ride room:
  // Map<rideId, Map<userId, { socketId, user, location, status, lastUpdated }>>
  const rideRoomState = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Ping / Pong test event
    socket.on('ping:test', (data) => {
      socket.emit('pong:test', {
        message: 'Socket connection healthy',
        receivedAt: new Date().toISOString()
      });
    });

    /**
     * Join Ride Socket Room
     * Event: ride:join
     * Payload: { rideId, user }
     */
    socket.on('ride:join', async (data) => {
      try {
        const { rideId, user } = data;
        if (!rideId || !user) return;

        const roomName = `ride:${rideId}`;
        socket.join(roomName);
        socket.rideId = rideId;
        socket.user = user;

        console.log(`[Socket.IO] User ${user.name} (${user._id}) joined room: ${roomName}`);

        // Initialize room state map if missing
        if (!rideRoomState.has(rideId)) {
          rideRoomState.set(rideId, new Map());
        }

        const roomMap = rideRoomState.get(rideId);
        
        // Retain previous location/status if reconnected, otherwise set defaults
        const existingState = roomMap.get(user._id) || {};
        const riderState = {
          socketId: socket.id,
          user: {
            _id: user._id,
            name: user.name,
            profilePhoto: user.profilePhoto,
            phone: user.phone
          },
          location: existingState.location || null,
          status: existingState.status || 'Riding',
          lastUpdated: new Date().toISOString(),
          online: true
        };

        roomMap.set(user._id, riderState);

        // Notify other riders in the room that a member joined
        socket.to(roomName).emit('member:joined', {
          user: riderState.user,
          timestamp: new Date().toISOString()
        });

        // Send full initial list of active riders in the room to the newly joined client
        const activeRiders = Array.from(roomMap.values());
        socket.emit('ride:initial_state', {
          riders: activeRiders
        });
      } catch (err) {
        console.error('[Socket ride:join Error]', err);
      }
    });

    /**
     * Real-time Location Update
     * Event: location:update
     * Payload: { rideId, latitude, longitude, accuracy, speed, heading, timestamp }
     */
    socket.on('location:update', (data) => {
      try {
        const { rideId, latitude, longitude, accuracy, speed, heading } = data;
        if (!rideId || !latitude || !longitude || !socket.user) return;

        const roomName = `ride:${rideId}`;
        const roomMap = rideRoomState.get(rideId);

        if (roomMap && roomMap.has(socket.user._id)) {
          const riderState = roomMap.get(socket.user._id);
          riderState.location = {
            latitude,
            longitude,
            accuracy: accuracy || 0,
            speed: speed || 0,
            heading: heading || 0
          };
          riderState.lastUpdated = new Date().toISOString();
          riderState.online = true;

          // Broadcast updated location to room (excluding sender)
          socket.to(roomName).emit('location:broadcast', {
            userId: socket.user._id,
            location: riderState.location,
            lastUpdated: riderState.lastUpdated
          });
        }
      } catch (err) {
        console.error('[Socket location:update Error]', err);
      }
    });

    /**
     * Real-time Rider Status Update (Riding, Refueling, Food Break, Emergency)
     * Event: status:update
     * Payload: { rideId, status }
     */
    socket.on('status:update', (data) => {
      try {
        const { rideId, status } = data;
        if (!rideId || !status || !socket.user) return;

        const roomName = `ride:${rideId}`;
        const roomMap = rideRoomState.get(rideId);

        if (roomMap && roomMap.has(socket.user._id)) {
          const riderState = roomMap.get(socket.user._id);
          riderState.status = status;
          riderState.lastUpdated = new Date().toISOString();

          // Broadcast status update to all clients in the ride room (including sender confirmation)
          io.to(roomName).emit('status:broadcast', {
            userId: socket.user._id,
            userName: socket.user.name,
            status,
            timestamp: riderState.lastUpdated
          });
        }
      } catch (err) {
        console.error('[Socket status:update Error]', err);
      }
    });

    /**
     * Leave Ride Room
     * Event: ride:leave
     */
    socket.on('ride:leave', (data) => {
      if (socket.rideId && socket.user) {
        const roomName = `ride:${socket.rideId}`;
        socket.leave(roomName);
        console.log(`[Socket.IO] User ${socket.user.name} left room ${roomName}`);
        
        const roomMap = rideRoomState.get(socket.rideId);
        if (roomMap && roomMap.has(socket.user._id)) {
          const riderState = roomMap.get(socket.user._id);
          riderState.online = false;
          socket.to(roomName).emit('member:left', {
            userId: socket.user._id,
            userName: socket.user.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    /**
     * Handle Client Disconnection
     */
    socket.on('disconnect', () => {
      if (socket.rideId && socket.user) {
        const roomName = `ride:${socket.rideId}`;
        const roomMap = rideRoomState.get(socket.rideId);
        if (roomMap && roomMap.has(socket.user._id)) {
          const riderState = roomMap.get(socket.user._id);
          riderState.online = false;
          socket.to(roomName).emit('member:left', {
            userId: socket.user._id,
            userName: socket.user.name,
            timestamp: new Date().toISOString()
          });
        }
      }
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocketServer;
