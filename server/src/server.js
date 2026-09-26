const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const initSocketServer = require('./sockets');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB asynchronously (non-blocking fallback)
connectDB().catch((err) => console.error('[Database Connect Error]', err.message));

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Socket.IO event handlers
initSocketServer(io);

// Start listening immediately
server.listen(PORT, () => {
  console.log(`[RideTogether Backend] Server operational in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
