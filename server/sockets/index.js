/**
 * sockets/index.js
 * ─────────────────────────────────────────────
 * Socket.io server initialisation and namespace wiring.
 *
 * Architecture:
 *   io (root /)
 *   └── /whiteboard  ← all real-time drawing traffic lives here
 *         ├── socketAuthMiddleware  – validates JWT per connection
 *         ├── roomHandlers.js       – join/leave/presence/chat
 *         └── boardHandlers.js      – draw/erase/undo/redo/clear
 *
 * Auth flow:
 *   Client sends auth.token in the handshake options.
 *   Middleware verifies the JWT and attaches socket.data.user.
 *   Unauthenticated connections are immediately terminated.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const boardHandlers = require('./boardHandlers');
const roomHandlers = require('./roomHandlers');
const screenHandlers = require('./screenHandlers');
const fileHandlers = require('./fileHandlers');

/**
 * socketAuthMiddleware
 * Validates the Bearer / handshake token and attaches the user
 * to socket.data so all handlers can access it safely.
 */
const socketAuthMiddleware = async (socket, next) => {
    // Token can arrive via:
    //  1. socket.handshake.auth.token  (preferred – set by client)
    //  2. Authorization header          (fallback for HTTP upgrade)
    const raw =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

    if (!raw) {
        return next(new Error('SOCKET_AUTH: no token provided'));
    }

    try {
        const decoded = jwt.verify(raw, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('name email avatar role');

        if (!user || user.isActive === false) {
            return next(new Error('SOCKET_AUTH: user not found or inactive'));
        }

        // Attach to socket so all handlers can read socket.data.user
        socket.data.user = { id: user._id.toString(), name: user.name, avatar: user.avatar };
        socket.data.roomKey = null; // set on join_room
        next();
    } catch (err) {
        next(new Error('SOCKET_AUTH: invalid or expired token'));
    }
};

/**
 * initSocket
 * @param {import('socket.io').Server} io
 */
const initSocket = (io) => {
    // ── /whiteboard namespace ─────────────────────────────────────
    const wbNS = io.of('/whiteboard');

    // Apply JWT auth to every new socket on this namespace
    wbNS.use(socketAuthMiddleware);

    wbNS.on('connection', (socket) => {
        const { name } = socket.data.user;
        console.log(`🎨  [WS] ${name} connected  –  ${socket.id}`);

        // Attach modular handlers
        roomHandlers(wbNS, socket);
        boardHandlers(wbNS, socket);
        screenHandlers(wbNS, socket);
        fileHandlers(wbNS, socket);

        socket.on('disconnect', (reason) => {
            console.log(`🎨  [WS] ${name} disconnected  –  ${reason}`);
        });
    });

    // ── Root namespace: health / monitoring only ──────────────────
    io.on('connection', (socket) => {
        console.log(`🔌  [WS/root] ${socket.id} connected`);
        socket.on('disconnect', () => {
            console.log(`🔌  [WS/root] ${socket.id} disconnected`);
        });
    });
};

module.exports = initSocket;
