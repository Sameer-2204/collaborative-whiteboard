/**
 * controllers/roomController.js
 * ─────────────────────────────────────────────
 * RESTful handlers for Room lifecycle management.
 *
 * Endpoint summary (all routes are protected):
 *
 *   POST   /api/rooms            → createRoom
 *   GET    /api/rooms            → getMyRooms
 *   GET    /api/rooms/:roomId    → getRoomById
 *   POST   /api/rooms/:roomId/join   → joinRoom
 *   POST   /api/rooms/:roomId/leave  → leaveRoom
 *   DELETE /api/rooms/:roomId    → closeRoom  (host only)
 */

const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────────
//  POST /api/rooms  –  Create a new room
// ─────────────────────────────────────────────────────────────────

/**
 * createRoom
 * The requesting user becomes the host.
 * A unique roomId code is generated automatically.
 *
 * Body (optional): { name, maxParticipants }
 */
const createRoom = asyncHandler(async (req, res) => {
    const { name = '', maxParticipants = 10 } = req.body;

    // 1. Generate a collision-safe 6-char code
    const roomId = await Room.generateRoomId();

    // 2. Create room with the requesting user as host+participant
    const room = await Room.create({
        roomId,
        name: name.trim(),
        host: req.user._id,
        maxParticipants,
        participants: [{ user: req.user._id, role: 'host', joinedAt: new Date() }],
    });

    await room.populate('participants.user', 'name email avatar');

    res.status(201).json({
        success: true,
        message: 'Room created',
        data: { room },
    });
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/rooms  –  Rooms the requesting user belongs to
// ─────────────────────────────────────────────────────────────────

/**
 * getMyRooms
 * Returns active rooms where req.user is a participant (or host).
 */
const getMyRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({
        'participants.user': req.user._id,
        isActive: true,
    })
        .populate('host', 'name email avatar')
        .populate('participants.user', 'name email avatar')
        .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        count: rooms.length,
        data: { rooms },
    });
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/rooms/:roomId  –  Get a single room
// ─────────────────────────────────────────────────────────────────

/**
 * getRoomById
 * Only participants of the room (or the host) may view full details.
 * Unauthenticated or non-member requests receive 403.
 *
 * Params: roomId (the 6-char code, NOT the MongoDB _id)
 */
const getRoomById = asyncHandler(async (req, res, next) => {
    const room = await Room.findOne({ roomId: req.params.roomId })
        .populate('host', 'name email avatar')
        .populate('participants.user', 'name email avatar');

    if (!room) {
        return next(new ApiError('Room not found', 404));
    }

    // Validate room is still active
    if (!room.isActive) {
        return next(new ApiError('This room has been closed', 410));
    }

    // Only members may see full room data
    if (!room.hasParticipant(req.user._id)) {
        return next(new ApiError('You are not a member of this room', 403));
    }

    res.status(200).json({
        success: true,
        data: { room },
    });
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/rooms/:roomId/join  –  Join an existing room
// ─────────────────────────────────────────────────────────────────

/**
 * joinRoom
 * Validates the room exists, is active, and has capacity.
 * If the user is already in the room, returns their current role instead.
 *
 * Params: roomId (6-char code)
 */
const joinRoom = asyncHandler(async (req, res, next) => {
    const room = await Room.findOne({ roomId: req.params.roomId });

    // 1. Validate existence
    if (!room) {
        return next(new ApiError(`No room found with code "${req.params.roomId}"`, 404));
    }

    // 2. Validate active
    if (!room.isActive) {
        return next(new ApiError('This room has been closed by the host', 410));
    }

    // 3. Already a member – return current state (idempotent)
    if (room.hasParticipant(req.user._id)) {
        await room.populate('participants.user', 'name email avatar');
        return res.status(200).json({
            success: true,
            message: 'Already a member of this room',
            data: { room, role: room.getRole(req.user._id) },
        });
    }

    // 4. Capacity check
    if (room.participants.length >= room.maxParticipants) {
        return next(new ApiError('This room is full', 409));
    }

    // 5. Add participant
    room.participants.push({
        user: req.user._id,
        role: 'participant',
        joinedAt: new Date(),
    });
    await room.save();
    await room.populate('participants.user', 'name email avatar');

    res.status(200).json({
        success: true,
        message: 'Joined room successfully',
        data: { room, role: 'participant' },
    });
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/rooms/:roomId/leave  –  Leave a room
// ─────────────────────────────────────────────────────────────────

/**
 * leaveRoom
 * If the host leaves:
 *   - If other participants exist → transfer host to the longest-standing member
 *   - If no other participants   → close the room (isActive = false)
 *
 * Regular participants are simply removed from the list.
 */
const leaveRoom = asyncHandler(async (req, res, next) => {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
        return next(new ApiError('Room not found', 404));
    }

    // Must be a member to leave
    if (!room.hasParticipant(req.user._id)) {
        return next(new ApiError('You are not a member of this room', 400));
    }

    const isHost = room.getRole(req.user._id) === 'host';

    // Remove the leaving user
    room.participants = room.participants.filter(
        p => p.user.toString() !== req.user._id.toString()
    );

    if (isHost) {
        if (room.participants.length === 0) {
            // Last person out – close the room
            room.isActive = false;
            await room.save();
            return res.status(200).json({
                success: true,
                message: 'Room closed (you were the last member)',
            });
        }

        // Transfer host role to the earliest remaining participant
        room.participants[0].role = 'host';
        room.host = room.participants[0].user;
    }

    await room.save();

    res.status(200).json({
        success: true,
        message: isHost
            ? `You left. Host transferred to another participant.`
            : 'You have left the room',
    });
});

// ─────────────────────────────────────────────────────────────────
//  DELETE /api/rooms/:roomId  –  Close a room (host only)
// ─────────────────────────────────────────────────────────────────

/**
 * closeRoom
 * Marks the room as inactive. All Socket.io clients should be
 * notified via the 'room:closed' event (handled in Socket layer).
 * Only the host may call this endpoint.
 */
const closeRoom = asyncHandler(async (req, res, next) => {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
        return next(new ApiError('Room not found', 404));
    }

    // Only the host can close the room
    if (room.host.toString() !== req.user._id.toString()) {
        return next(new ApiError('Only the host can close this room', 403));
    }

    if (!room.isActive) {
        return next(new ApiError('Room is already closed', 400));
    }

    room.isActive = false;
    await room.save();

    res.status(200).json({
        success: true,
        message: `Room "${room.roomId}" has been closed`,
    });
});

module.exports = { createRoom, getMyRooms, getRoomById, joinRoom, leaveRoom, closeRoom };
