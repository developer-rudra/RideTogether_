const mongoose = require('mongoose');

/**
 * Connects to MongoDB database using Mongoose ORM.
 * If local/cloud MongoDB connection fails, falls back to MongoMemoryServer automatically
 * for zero-config local development and testing.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ridetogether';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000 // Fast fail to memory fallback if local mongod absent
    });
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}`);
  } catch (primaryError) {
    console.warn(`[Database Warning] Primary MongoDB connection failed (${primaryError.message}). Booting in-memory database...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      const memoryConn = await mongoose.connect(memoryUri);
      console.log(`[Database] In-Memory MongoDB Server Connected: ${memoryConn.connection.host}`);
    } catch (fallbackError) {
      console.error(`[Database Error] In-Memory MongoDB setup failed: ${fallbackError.message}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
