/**
 * routes/boardRoutes.js
 * ─────────────────────────────────────────────
 * Defines REST endpoints for the Board resource.
 *
 * Base path: /api/boards  (mounted in server.js)
 *
 * All routes below the `protect` middleware require a
 * valid Bearer JWT in the Authorization header.
 *
 * HTTP Verb  Path          Controller         Access
 * ─────────  ────────────  ─────────────────  ────────
 * GET        /             getBoards          Private
 * GET        /:id          getBoardById       Private
 * POST       /             createBoard        Private
 * PUT        /:id          updateBoard        Private
 * DELETE     /:id          deleteBoard        Private
 */

const express = require('express');
const router = express.Router();

const {
    getBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
} = require('../controllers/boardController');

const { protect } = require('../middleware/authMiddleware');

// Apply auth guard to every route in this file
router.use(protect);

router.route('/').get(getBoards).post(createBoard);
router.route('/:id').get(getBoardById).put(updateBoard).delete(deleteBoard);

module.exports = router;
