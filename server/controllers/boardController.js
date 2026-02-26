/**
 * controllers/boardController.js
 * ─────────────────────────────────────────────
 * Handles all HTTP request/response logic for Board resources.
 *
 * Each exported function is a route handler. It receives
 * (req, res, next) from Express, delegates to models/services,
 * and sends a standardised JSON response.
 *
 * All handlers are wrapped with asyncHandler so unhandled
 * promise rejections are forwarded to the global error handler
 * without try/catch boilerplate.
 *
 * TODO (Phase 2):
 *  - Implement full CRUD operations
 *  - Add filtering, sorting, and pagination to getBoards
 *  - Add share-code generation in createBoard
 *  - Emit Socket.io events on board updates
 */

const asyncHandler = require('../utils/asyncHandler');
// const Board = require('../models/Board');  // Uncomment in Phase 2

// ── GET /api/boards ─────────────────────────────────────────────
/**
 * getBoards
 * Returns all boards the authenticated user has access to.
 */
const getBoards = asyncHandler(async (req, res) => {
    // TODO: Board.find({ owner: req.user.id })
    res.status(200).json({ success: true, data: [], message: 'getBoards – not implemented yet' });
});

// ── GET /api/boards/:id ──────────────────────────────────────────
/**
 * getBoardById
 * Returns a single board by its Mongo ObjectId.
 */
const getBoardById = asyncHandler(async (req, res) => {
    // TODO: Board.findById(req.params.id)
    res.status(200).json({ success: true, data: {}, message: 'getBoardById – not implemented yet' });
});

// ── POST /api/boards ─────────────────────────────────────────────
/**
 * createBoard
 * Creates a new board document. Assigns owner from req.user.
 */
const createBoard = asyncHandler(async (req, res) => {
    // TODO: Board.create({ ...req.body, owner: req.user.id })
    res.status(201).json({ success: true, data: {}, message: 'createBoard – not implemented yet' });
});

// ── PUT /api/boards/:id ──────────────────────────────────────────
/**
 * updateBoard
 * Updates board metadata (name, visibility, etc.).
 */
const updateBoard = asyncHandler(async (req, res) => {
    // TODO: Board.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    res.status(200).json({ success: true, data: {}, message: 'updateBoard – not implemented yet' });
});

// ── DELETE /api/boards/:id ───────────────────────────────────────
/**
 * deleteBoard
 * Soft-deletes or permanently removes a board.
 */
const deleteBoard = asyncHandler(async (req, res) => {
    // TODO: Board.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: 'deleteBoard – not implemented yet' });
});

module.exports = {
    getBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
};
