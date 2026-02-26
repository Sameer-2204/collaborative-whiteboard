/**
 * routes/fileRoutes.js
 * ─────────────────────────────────────────────
 * File sharing endpoints for whiteboard rooms.
 *
 * Method   Path                           Auth     Who?
 * ───────  ───────────────────────────    ──────   ──────────────────────
 * POST     /api/rooms/:roomId/files       JWT      Any room member
 * GET      /api/rooms/:roomId/files       JWT      Any room member
 */

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const { protect } = require('../middleware/authMiddleware');
const SharedFile = require('../models/SharedFile');
const Room = require('../models/Room');

const router = express.Router({ mergeParams: true }); // gives access to :roomId

// ── Multer disk storage ───────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        // <timestamp>-<random-hex>.<ext> to avoid collisions
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, name);
    },
});

// ── File filter: only images and PDFs ────────────────────────────
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/svg+xml', 'application/pdf',
];

const fileFilter = (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type "${file.mimetype}" is not allowed. Upload an image or PDF.`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB
        files: 1,
    },
});

// ── All routes require a valid JWT ────────────────────────────────
router.use(protect);

// ── Helper: verify caller is a room member ────────────────────────
async function requireMembership(req, res, next) {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
    if (!room || !room.isActive) {
        return res.status(404).json({ success: false, message: 'Room not found' });
    }
    if (!room.hasParticipant(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Not a member of this room' });
    }
    req.room = room;
    next();
}

// ── POST /api/rooms/:roomId/files ─────────────────────────────────
// Accepts a single file (image or PDF), saves to disk, stores metadata.
router.post('/', requireMembership, (req, res, next) => {
    upload.single('file')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        try {
            const { file, room, user } = req;
            const roomId = room.roomId;

            // Public URL: served by Express static middleware
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const url = `${baseUrl}/uploads/${file.filename}`;

            const shared = await SharedFile.create({
                roomId,
                originalName: file.originalname,
                filename: file.filename,
                mimeType: file.mimetype,
                size: file.size,
                url,
                uploadedBy: { id: user._id.toString(), name: user.name },
            });

            res.status(201).json({
                success: true,
                file: {
                    fileId: shared._id.toString(),
                    url,
                    name: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    uploadedBy: shared.uploadedBy,
                    sharedAt: shared.createdAt.toISOString(),
                },
            });
        } catch (saveErr) {
            // Remove orphaned file on DB error
            fs.unlink(req.file.path, () => { });
            next(saveErr);
        }
    });
});

// ── GET /api/rooms/:roomId/files ──────────────────────────────────
// Returns the 50 most-recently shared files for this room.
router.get('/', requireMembership, async (req, res, next) => {
    try {
        const files = await SharedFile.forRoom(req.params.roomId);
        res.json({
            success: true,
            files: files.map(f => ({
                fileId: f._id.toString(),
                url: f.url,
                name: f.originalName,
                mimeType: f.mimeType,
                size: f.size,
                sharedBy: f.uploadedBy,
                sharedAt: f.createdAt.toISOString(),
            })),
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
