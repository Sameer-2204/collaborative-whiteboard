/**
 * server/models/Stroke.js
 * ─────────────────────────────────────────────
 * Persists each individual drawing stroke to MongoDB.
 *
 * One document = one completed stroke action (pen up / eraser up).
 * Strokes are replayed in chronological order when a user joins.
 *
 * Schema:
 *   roomId    – room that owns this stroke (index)
 *   stroke    – the full sanitised stroke object from boardHandlers
 *   createdAt – monotonically increasing, used for replay ordering
 *
 * Statics:
 *   Stroke.clearForRoom(roomId) – deletes all strokes for a room
 *   Stroke.forRoom(roomId)      – returns ordered array for replay
 *
 * TTL: strokes expire after 7 days to keep the collection lean.
 * (Increase expireAfterSeconds if longer persistence is needed.)
 */

const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            index: true,
            uppercase: true,
            trim: true,
        },
        // The sanitised stroke object { id, type, tool, color, size, points, userId? }
        stroke: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// ── Compound index for ordered replay ───────────────────────────
StrokeSchema.index({ roomId: 1, createdAt: 1 });

// ── TTL: auto-delete strokes older than 7 days ──────────────────
StrokeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// ── Statics ─────────────────────────────────────────────────────
StrokeSchema.statics.clearForRoom = function (roomId) {
    return this.deleteMany({ roomId: roomId.toUpperCase() });
};

StrokeSchema.statics.forRoom = function (roomId) {
    return this.find({ roomId: roomId.toUpperCase() })
        .sort({ createdAt: 1 })
        .lean();
};

const Stroke = mongoose.model('Stroke', StrokeSchema);
module.exports = Stroke;
