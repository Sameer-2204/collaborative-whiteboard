/**
 * config/db.js
 * ─────────────────────────────────────────────
 * Responsible for establishing and managing the
 * MongoDB connection via Mongoose.
 *
 * Called once at server startup (server.js).
 * Mongoose maintains a connection pool internally,
 * so this single call is enough for the entire app.
 */

const mongoose = require('mongoose');

/**
 * connectDB
 * Connects to MongoDB using the URI stored in MONGO_URI.
 * Exits the process if the connection fails on startup.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser and useUnifiedTopology are defaults in
      // Mongoose 6+, listed here for explicitness / older versions
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    // ── Connection event listeners ──────────────────────────────
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️   MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.info('🔄  MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌  MongoDB error: ${err.message}`);
    });
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    // Exit with failure so the process manager (PM2, Docker) can restart
    process.exit(1);
  }
};

module.exports = connectDB;
