/**
 * models/SharedFile.js
 * ─────────────────────────────────────────────
 * Stores metadata for every file shared inside a room.
 * Actual file bytes live at  server/uploads/<filename>
 * and are served as static assets from /uploads/*.
 *
 * 30-day TTL keeps the collection from growing unbounded.
 * Compound index on { roomId, createdAt } allows efficient
 * per-room pagination in chronological order.
 */

const mongoose = require('mongoose');

const SharedFileSchema = new mongoose.Schema(
    {
        // Which room this file belongs to
        roomId: {
            type: String,
            required: true,
            index: true,
            uppercase: true,
            trim: true,
        },

        // Original filename as uploaded (sanitised by multer)
        originalName: {
            type: String,
            required: true,
            maxlength: 255,
            trim: true,
        },

        // Disk filename (uuid-based, avoids collisions)
        filename: {
            type: String,
            required: true,
        },

        // MIME type – used by clients to decide how to render
        mimeType: {
            type: String,
            required: true,
        },

        // File size in bytes
        size: {
            type: Number,
            required: true,
        },

        // Public URL that clients use to fetch the file
        url: {
            type: String,
            required: true,
        },

        // Snapshot of who shared it (avoids extra User lookups)
        uploadedBy: {
            id: { type: String, required: true },
            name: { type: String, required: true },
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// ── Indexes ───────────────────────────────────────────────────────
SharedFileSchema.index({ roomId: 1, createdAt: -1 }); // newest-first list
SharedFileSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30-day TTL
);

// ── Statics ───────────────────────────────────────────────────────
SharedFileSchema.statics.forRoom = function (roomId, limit = 50) {
    return this.find({ roomId: roomId.toUpperCase() })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

module.exports = mongoose.model('SharedFile', SharedFileSchema);
