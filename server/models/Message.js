/**
 * server/models/Message.js
 * ─────────────────────────────────────────────
 * Persists in-room chat messages to MongoDB.
 *
 * Schema:
 *   roomId  – references the Room.roomId (string, not ObjectId)
 *   user    – embedded snapshot { id, name } so messages survive user deletion
 *   text    – message body (max 500 chars, enforced in roomHandlers)
 *   sentAt  – ISO timestamp (set by server, not client)
 *
 * Index strategy:
 *   Compound index on { roomId, sentAt } for efficient history queries.
 *   TTL index on sentAt expires messages after 30 days to cap storage.
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            index: true,
            uppercase: true,
            trim: true,
        },
        user: {
            id: { type: String, required: true },  // user._id as string
            name: { type: String, required: true },
        },
        text: {
            type: String,
            required: true,
            maxlength: 500,
            trim: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        // No updatedAt needed — messages are immutable
        timestamps: false,
    }
);

// ── Compound index for history queries ──────────────────────────
MessageSchema.index({ roomId: 1, sentAt: -1 });

// ── TTL: auto-delete messages older than 30 days ────────────────
MessageSchema.index({ sentAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
