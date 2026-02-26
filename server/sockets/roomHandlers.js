/**
 * sockets/roomHandlers.js
 * ─────────────────────────────────────────────
 * Room lifecycle, chat persistence, and presence tracking.
 *
 * Event Catalogue
 * ──────────────────────────────────────────────────────────────
 * Client emits      Payload              Server action
 * ───────────────   ─────────────────    ──────────────────────────────────────
 * join_room         { roomId }           join room, send history + presence
 * leave_room        { roomId }           leave room, broadcast presence update
 * send_message      { roomId, text }     persist, broadcast chat_message
 * cursor:move       { x, y }             relay cursor position (excl. sender)
 *
 * Server emits           To
 * ──────────────────     ──────────────────────────────────────────────────
 * room:joined            sender   { roomId, role, onlineCount }
 * chat:history           sender   [{ user, text, sentAt }]  – last 50 msgs
 * presence:snapshot      sender   [{ id, name }]            – who is online
 * user_joined            room     { user, onlineUsers }
 * user_left              room     { userId, name, onlineUsers }
 * chat_message           room     { user, text, sentAt }
 * room:error             sender   { message }
 */

const Room = require('../models/Room');
const Message = require('../models/Message');
const Stroke = require('../models/Stroke');

/**
 * buildPresenceList
 * Returns a deduplicated array of { id, name } for all sockets in a room.
 * @param {import('socket.io').Namespace} namespace
 * @param {string} roomKey
 * @returns {Promise<{id:string, name:string}[]>}
 */
const buildPresenceList = async (namespace, roomKey) => {
    const sockets = await namespace.in(roomKey).fetchSockets();
    const seen = new Set();
    const users = [];
    for (const s of sockets) {
        const u = s.data?.user;
        if (u && !seen.has(u.id)) {
            seen.add(u.id);
            users.push({ id: u.id, name: u.name });
        }
    }
    return users;
};

/**
 * roomHandlers
 * @param {import('socket.io').Namespace} namespace
 * @param {import('socket.io').Socket}    socket
 */
const roomHandlers = (namespace, socket) => {
    const { user } = socket.data;

    // ─────────────────────────────────────────────────────────────
    //  join_room
    // ─────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomId } = {}) => {
        if (!roomId) {
            return socket.emit('room:error', { message: 'roomId is required' });
        }

        // 1. Validate room exists in DB and is active
        const room = await Room.findOne({ roomId, isActive: true });
        if (!room) {
            return socket.emit('room:error', {
                message: `Room "${roomId}" not found or closed`,
            });
        }

        // 2. Validate user is a REST-joined participant
        if (!room.hasParticipant(user.id)) {
            return socket.emit('room:error', {
                message: 'You must join the room via the API before connecting',
            });
        }

        // 3. Leave any previously held room
        if (socket.data.roomKey) {
            await _leaveRoom(socket.data.roomKey, namespace, socket, user);
        }

        // 4. Join Socket.io room
        const roomKey = `room:${roomId}`;
        const role = room.getRole(user.id);   // 'host' | 'participant'
        socket.data.roomKey = roomKey;
        socket.data.roomId = roomId;
        socket.data.role = role;
        await socket.join(roomKey);

        // 5. Build presence list AFTER joining so the newcomer is included
        const onlineUsers = await buildPresenceList(namespace, roomKey);

        // 6. Send joining socket: ACK + message history + presence snapshot
        const history = await Message.find({ roomId })
            .sort({ sentAt: -1 })
            .limit(50)
            .lean();

        socket.emit('room:joined', {
            roomId,
            user,
            onlineCount: onlineUsers.length,
            role,
        });

        // History is sent newest-first from DB; reverse to display oldest-first
        socket.emit('chat:history', history.reverse().map(m => ({
            user: m.user,
            text: m.text,
            sentAt: m.sentAt.toISOString(),
        })));

        // Presence snapshot: who is currently online
        socket.emit('presence:snapshot', onlineUsers);

        // Canvas stroke replay: load all persisted strokes (oldest-first)
        const strokes = await Stroke.forRoom(roomId);
        socket.emit('canvas:restore', strokes.map(s => s.stroke));

        // 7. Notify peers that a new user joined
        socket.to(roomKey).emit('user_joined', {
            user,
            onlineUsers,
        });

        console.log(`📋  ${user.name} joined room:${roomId}  (${onlineUsers.length} online)`);
    });

    // ─────────────────────────────────────────────────────────────
    //  leave_room
    // ─────────────────────────────────────────────────────────────
    socket.on('leave_room', async ({ roomId } = {}) => {
        const roomKey = `room:${roomId}`;
        await _leaveRoom(roomKey, namespace, socket, user);
        socket.data.roomKey = null;
        socket.data.roomId = null;
    });

    // ─────────────────────────────────────────────────────────────
    //  send_message  – persist + broadcast
    // ─────────────────────────────────────────────────────────────
    socket.on('send_message', async ({ roomId, text } = {}) => {
        const trimmed = text?.trim().slice(0, 500);
        if (!trimmed) return;
        if (!socket.data.roomKey) return;

        const sentAt = new Date();
        const roomKey = socket.data.roomKey;

        // Persist to MongoDB (fire & forget — don't block broadcast)
        Message.create({
            roomId: (roomId || socket.data.roomId || '').toUpperCase(),
            user: { id: user.id, name: user.name },
            text: trimmed,
            sentAt,
        }).catch(err => console.error('Message.create error:', err));

        // Broadcast to EVERYONE in the room (sender sees their own message)
        namespace.to(roomKey).emit('chat_message', {
            user: { id: user.id, name: user.name },
            text: trimmed,
            sentAt: sentAt.toISOString(),
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  cursor:move  (high-frequency, relay only – never persisted)
    // ─────────────────────────────────────────────────────────────
    socket.on('cursor:move', ({ x, y } = {}) => {
        if (!socket.data.roomKey) return;
        socket.to(socket.data.roomKey).emit('cursor:move', {
            userId: user.id,
            name: user.name,
            x,
            y,
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  disconnect cleanup
    // ─────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
        if (socket.data.roomKey) {
            await _leaveRoom(socket.data.roomKey, namespace, socket, user);
        }
    });
};

// ─────────────────────────────────────────────────────────────────
//  Shared leave helper (used by leave_room + disconnect)
// ─────────────────────────────────────────────────────────────────
async function _leaveRoom(roomKey, namespace, socket, user) {
    await socket.leave(roomKey);

    // Build presence list AFTER leaving so the departing user is excluded
    const onlineUsers = await buildPresenceList(namespace, roomKey);

    socket.to(roomKey).emit('user_left', {
        userId: user.id,
        name: user.name,
        onlineUsers,
    });

    const roomId = roomKey.replace('room:', '');
    console.log(`📋  ${user.name} left room:${roomId}  (${onlineUsers.length} online)`);
}

module.exports = roomHandlers;
