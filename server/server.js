/**
 * server.js
 * ─────────────────────────────────────────────
 * Application entry point.
 *
 * Responsibilities:
 *  1. Load environment variables via dotenv
 *  2. Connect to MongoDB
 *  3. Configure the Express application
 *     a. Security headers  (helmet)
 *     b. CORS policy       (cors + corsOptions)
 *     c. Request parsing   (json, urlencoded)
 *     d. HTTP logging      (morgan)
 *     e. Rate limiting     (express-rate-limit)
 *     f. Mount API routes
 *     g. Health-check route
 *     h. 404 handler
 *     i. Global error handler (must be last)
 *  4. Attach Socket.io to the HTTP server
 *  5. Start listening
 */

// ── 1. Environment variables ─────────────────────────────────────
// Must be the very first require so every subsequent module
// that reads process.env gets the correct values.
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

// ── Config ───────────────────────────────────────────────────────
const connectDB = require('./config/db');
const corsOptions = require('./config/corsOptions');

// ── Routes ───────────────────────────────────────────────────────
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const boardRoutes = require('./routes/boardRoutes');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const fileRoutes = require('./routes/fileRoutes');

// ── Middleware ───────────────────────────────────────────────────
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// ── Socket handler ───────────────────────────────────────────────
const initSocket = require('./sockets');

// ── 2. Connect to MongoDB ────────────────────────────────────────
connectDB();

// ── 3. Create & configure Express app ───────────────────────────
const app = express();

// a) Security headers – adds X-Content-Type-Options, X-Frame-Options, etc.
app.use(helmet());

// b) CORS – allow configured origins (see config/corsOptions.js)
app.use(cors(corsOptions));

// c) Body parsers
app.use(express.json({ limit: '10mb' }));          // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));   // Parse form bodies

// d) HTTP request logger (skip in test environment to keep output clean)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// e) Global rate limiter – applied to all /api/* routes
app.use('/api', apiLimiter);

// ── Health-check endpoint ────────────────────────────────────────
// Used by load balancers / uptime monitors.
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is up and running 🚀',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
});

// f) Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms/:roomId/files', fileRoutes); // file sharing

// g) Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// g) 404 catch-all – any route not matched above
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// h) Central error handler – MUST be registered after all routes
app.use(errorHandler);

// ── 4. Create HTTP server & attach Socket.io ─────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    // CORS for Socket.io handshake (mirrors Express CORS config)
    cors: {
        origin: corsOptions.origin,
        credentials: corsOptions.credentials,
    },

    // Connection state recovery – lets clients reconnect seamlessly
    // and receive missed events (requires Socket.io 4.6+)
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
    },
});

// Register all socket namespaces and event handlers
initSocket(io);

// ── 5. Start listening ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🖊️  Whiteboard Server                       ║
  ║   Mode  : ${(process.env.NODE_ENV || 'development').padEnd(35)}║
  ║   Port  : ${String(PORT).padEnd(35)}║
  ╚══════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ────────────────────────────────────────────
// Ensure connections are cleanly closed when the process is stopped
// (SIGTERM from Docker/PM2, SIGINT from Ctrl-C in dev).
const gracefulShutdown = (signal) => {
    console.log(`\n⚙️   ${signal} received – shutting down gracefully…`);
    httpServer.close(() => {
        console.log('✅  HTTP server closed');
        // Mongoose automatically closes on process exit, but you may call:
        // mongoose.connection.close(false, () => process.exit(0));
        process.exit(0);
    });

    // Force-kill if shutdown takes longer than 10 s
    setTimeout(() => {
        console.error('❌  Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections (e.g. DB query outside asyncHandler)
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌  Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally shut down: gracefulShutdown('unhandledRejection');
});

module.exports = { app, httpServer }; // Export for testing with supertest
