/**
 * routes/authRoutes.js
 * ─────────────────────────────────────────────
 * Authentication REST endpoints.
 * Base path: /api/auth  (mounted in server.js)
 *
 * Method  Path          Controller    Guard          Rate Limit
 * ──────  ────────────  ────────────  ─────────────  ──────────
 * POST    /register     register      Public         authLimiter
 * POST    /login        login         Public         authLimiter
 * POST    /logout       logout        protect        –
 * GET     /me           getMe         protect        –
 * PUT     /me/theme     updateTheme   protect        –
 */

const express = require('express');
const router = express.Router();

const {
    register,
    login,
    logout,
    getMe,
    updateTheme,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// ── Public ──────────────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// ── Protected ───────────────────────────────────────────────────
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me/theme', protect, updateTheme);

module.exports = router;
