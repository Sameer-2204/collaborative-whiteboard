/**
 * models/Room.js
 * ─────────────────────────────────────────────
 * A Room represents a single live collaborative session.
 *
 * roomId     – human-shareable 6-char uppercase code (e.g. "WB1A3X")
 * host       – User who created the room (always a participant)
 * participants – embedded subdocs: { user, role, joinedAt }
 * canvasData – JSON snapshot of the current canvas state (updated via Socket.io)
 * isActive   – false once the host closes the room
 *
 * Roles:
 *   'host'        – created the room, can close it and kick participants
 *   'participant' – joined via roomId, can draw
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// ── Participant sub-schema ───────────────────────────────────────
const ParticipantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['host', 'participant'],
            default: 'participant',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false } // no extra _id per participant entry
);

// ── Main Room schema ─────────────────────────────────────────────
const RoomSchema = new mongoose.Schema(
    {
        // Short, human-shareable join code
        roomId: {
            type: String,
            unique: true,
            index: true,
            uppercase: true,
            trim: true,
        },

        // Optional display name
        name: {
            type: String,
            trim: true,
            maxlength: [80, 'Room name cannot exceed 80 characters'],
            default: '',
        },

        // User who created the room
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // All current participants (includes host)
        participants: {
            type: [ParticipantSchema],
            default: [],
        },

        // Maximum number of users allowed in the room
        maxParticipants: {
            type: Number,
            default: 10,
            min: [2, 'At least 2 participants required'],
            max: [50, 'Cannot exceed 50 participants'],
        },

        // Serialised canvas state – updated by Socket.io on draw events
        // Structure mirrors the client canvas element list
        canvasData: {
            type: mongoose.Schema.Types.Mixed,
            default: { elements: [], background: '#ffffff', version: 0 },
        },

        // false once the host explicitly closes the room
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Virtual: current participant count ───────────────────────────
RoomSchema.virtual('participantCount').get(function () {
    return this.participants.length;
});

// ── Static: generate a unique 6-char roomId ──────────────────────
/**
 * generateRoomId
 * Produces a cryptographically random 6-character uppercase alphanumeric
 * string. Retries if a collision is found in the DB (extremely rare).
 *
 * @returns {Promise<string>}
 */
RoomSchema.statics.generateRoomId = async function () {
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
    const LENGTH = 6;

    let id, exists;
    do {
        id = Array.from(crypto.randomBytes(LENGTH))
            .map(b => CHARS[b % CHARS.length])
            .join('');
        exists = await this.exists({ roomId: id });
    } while (exists);

    return id;
};

// ── Instance: check if a user is in the room ─────────────────────
RoomSchema.methods.hasParticipant = function (userId) {
    return this.participants.some(p => p.user.toString() === userId.toString());
};

// ── Instance: get a participant's role ────────────────────────────
RoomSchema.methods.getRole = function (userId) {
    const entry = this.participants.find(p => p.user.toString() === userId.toString());
    return entry?.role ?? null;
};

module.exports = mongoose.model('Room', RoomSchema);
