/**
 * routes/roomRoutes.js
 * ─────────────────────────────────────────────
 * All room endpoints are protected (JWT required).
 * Base path: /api/rooms  (mounted in server.js)
 *
 * Method   Path                    Handler          Who?
 * ───────  ──────────────────────  ───────────────  ─────────────
 * POST     /                       createRoom       Any authed user
 * GET      /                       getMyRooms       Any authed user
 * GET      /:roomId                getRoomById      Room member only
 * POST     /:roomId/join           joinRoom         Any authed user
 * POST     /:roomId/leave          leaveRoom        Room member only
 * DELETE   /:roomId                closeRoom        Host only
 */

const express = require('express');
const router = express.Router();

const {
    createRoom,
    getMyRooms,
    getRoomById,
    joinRoom,
    leaveRoom,
    closeRoom,
} = require('../controllers/roomController');

const { protect } = require('../middleware/authMiddleware');

// All routes below require a valid JWT
router.use(protect);

router.route('/')
    .post(createRoom)   // create a new room
    .get(getMyRooms);  // list rooms I belong to

router.route('/:roomId')
    .get(getRoomById) // get room details (members only)
    .delete(closeRoom);  // close room (host only)

router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);

module.exports = router;
