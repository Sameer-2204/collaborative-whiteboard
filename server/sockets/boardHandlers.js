/**
 * sockets/boardHandlers.js
 * ─────────────────────────────────────────────
 * Real-time drawing events + stroke persistence.
 *
 * Stroke shape (canonical – enforced by validateStroke):
 * {
 *   id     : string         – client UUID for dedup
 *   type   : 'stroke'
 *   tool   : 'pen' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'text'
 *   color  : string         – CSS colour
 *   size   : number         – brush px
 *   points : [{ x, y }]
 *   text?  : string         – only when tool === 'text'
 * }
 *
 * Persistence:
 *   draw / erase  → Stroke.create()        (non-blocking, fire & forget)
 *   clear_board   → Stroke.clearForRoom()  (deletes all strokes for room)
 *
 * Event Catalogue
 * ─────────────────────────────────────────────────────────────────
 * Client emits    Payload          Server broadcasts  To
 * ─────────────   ──────────────   ─────────────────  ──────────
 * draw            stroke object    draw               rest of room
 * erase           stroke object    erase              rest of room
 * clear_board     —                clear_board        whole room
 * undo            —                undo               rest of room
 * redo            —                redo               rest of room
 */

const Stroke = require('../models/Stroke');

const ALLOWED_TOOLS = new Set(['pen', 'eraser', 'line', 'rect', 'ellipse', 'text']);
const MAX_POINTS = 5000;

/**
 * validateStroke – returns error string or null if valid
 */
const validateStroke = (payload) => {
    if (!payload || typeof payload !== 'object') return 'payload must be an object';
    if (typeof payload.id !== 'string') return 'id must be a string';
    if (!ALLOWED_TOOLS.has(payload.tool)) return `tool must be one of: ${[...ALLOWED_TOOLS].join(', ')}`;
    if (typeof payload.color !== 'string') return 'color must be a string';
    if (typeof payload.size !== 'number' || payload.size <= 0) return 'size must be a positive number';
    if (!Array.isArray(payload.points)) return 'points must be an array';
    if (payload.points.length === 0) return 'points must not be empty';
    if (payload.points.length > MAX_POINTS) return `points exceeds max length (${MAX_POINTS})`;
    for (const p of payload.points) {
        if (typeof p.x !== 'number' || typeof p.y !== 'number') {
            return 'each point must have numeric x and y';
        }
    }
    return null;
};

/**
 * sanitiseStroke – strips unknown keys before relay / persist
 */
const sanitiseStroke = (payload, userId) => ({
    id: payload.id,
    type: 'stroke',
    tool: payload.tool,
    color: payload.color,
    size: payload.size,
    points: payload.points,
    ...(payload.tool === 'text' && typeof payload.text === 'string'
        ? { text: payload.text.slice(0, 1000) }
        : {}),
    userId,
});

/**
 * boardHandlers
 * @param {import('socket.io').Namespace} namespace
 * @param {import('socket.io').Socket}    socket
 */
const boardHandlers = (namespace, socket) => {
    const { user } = socket.data;

    // ─────────────────────────────────────────────────────────────
    //  draw  – freehand / shape stroke
    // ─────────────────────────────────────────────────────────────
    socket.on('draw', async (payload) => {
        if (!socket.data.roomKey) return;

        const err = validateStroke(payload);
        if (err) return socket.emit('board:error', { event: 'draw', message: err });

        const stroke = sanitiseStroke(payload, user.id);
        const roomId = socket.data.roomId;

        // 1. Persist to MongoDB (non-blocking)
        Stroke.create({ roomId, stroke }).catch(e =>
            console.error('Stroke.create (draw) error:', e)
        );

        // 2. Broadcast to peers (sender already rendered locally)
        socket.to(socket.data.roomKey).emit('draw', stroke);
    });

    // ─────────────────────────────────────────────────────────────
    //  erase  – eraser stroke (same shape, tool forced to 'eraser')
    // ─────────────────────────────────────────────────────────────
    socket.on('erase', async (payload) => {
        if (!socket.data.roomKey) return;

        const normalised = { ...payload, tool: 'eraser' };
        const err = validateStroke(normalised);
        if (err) return socket.emit('board:error', { event: 'erase', message: err });

        const stroke = sanitiseStroke(normalised, user.id);
        const roomId = socket.data.roomId;

        Stroke.create({ roomId, stroke }).catch(e =>
            console.error('Stroke.create (erase) error:', e)
        );

        socket.to(socket.data.roomKey).emit('erase', stroke);
    });

    // ─────────────────────────────────────────────────────────────
    //  clear_board  – wipe canvas + delete all persisted strokes
    // ─────────────────────────────────────────────────────────────
    socket.on('clear_board', async () => {
        if (!socket.data.roomKey) return;

        // ── Host-only guard (server-side, authoritative) ──────────
        if (socket.data.role !== 'host') {
            return socket.emit('board:error', {
                event: 'clear_board',
                code: 'FORBIDDEN',
                message: 'Only the host can clear the board',
            });
        }

        const roomId = socket.data.roomId;

        // Delete all strokes for this room from MongoDB
        Stroke.clearForRoom(roomId).catch(e =>
            console.error('Stroke.clearForRoom error:', e)
        );

        // Broadcast to EVERYONE (including sender) so all clients clear
        namespace.to(socket.data.roomKey).emit('clear_board', {
            clearedBy: { id: user.id, name: user.name },
            clearedAt: new Date().toISOString(),
        });

        console.log(`🗑️   ${user.name} [host] cleared room ${roomId}  – strokes deleted`);
    });

    // ─────────────────────────────────────────────────────────────
    //  undo  – intent signal to peers (client manages its own stack)
    // ─────────────────────────────────────────────────────────────
    socket.on('undo', () => {
        if (!socket.data.roomKey) return;
        socket.to(socket.data.roomKey).emit('undo', { userId: user.id });
    });

    // ─────────────────────────────────────────────────────────────
    //  redo
    // ─────────────────────────────────────────────────────────────
    socket.on('redo', () => {
        if (!socket.data.roomKey) return;
        socket.to(socket.data.roomKey).emit('redo', { userId: user.id });
    });
};

module.exports = boardHandlers;
