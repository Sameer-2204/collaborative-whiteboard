/**
 * models/Board.js
 * ─────────────────────────────────────────────
 * Mongoose schema for a Whiteboard document.
 *
 * A Board aggregates all drawing elements, connected
 * users, and metadata for a single collaborative session.
 * Business logic (save, update, delete) will be added
 * in the corresponding controller/service layer.
 *
 * TODO (Phase 2):
 *  - Add `elements` array (shapes, paths, text, images)
 *  - Add `participants` with permission roles
 *  - Add cursor broadcast data structure
 *  - Add version history / snapshots
 */

const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema(
    {
        // Human-readable board name shown in the UI
        name: {
            type: String,
            required: [true, 'Board name is required'],
            trim: true,
            maxlength: [100, 'Board name cannot exceed 100 characters'],
        },

        // Reference to the user who created the board
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Short code / slug used to share the board
        shareCode: {
            type: String,
            unique: true,
            index: true,
        },

        // Board-level access: 'private' | 'public' | 'link'
        visibility: {
            type: String,
            enum: ['private', 'public', 'link'],
            default: 'private',
        },

        // Placeholder for drawing elements (populated in Phase 2)
        // elements: [ElementSchema],

        // Placeholder for connected member references
        // members: [{ user: ObjectId, role: String }],
    },
    {
        // Automatically add createdAt and updatedAt fields
        timestamps: true,

        // Include virtual properties when converting to JSON
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

module.exports = mongoose.model('Board', BoardSchema);
