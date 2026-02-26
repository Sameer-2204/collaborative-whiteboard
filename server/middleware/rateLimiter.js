/**
 * middleware/rateLimiter.js
 * ─────────────────────────────────────────────
 * Request-rate limiting using `express-rate-limit`.
 *
 * Applied globally in server.js to protect against
 * brute-force / denial-of-service attacks.
 *
 * Different limiters can be created for:
 *  - API endpoints in general  (apiLimiter)
 *  - Login / register routes   (authLimiter)  ← stricter
 *
 * Requires: npm install express-rate-limit
 */

const rateLimit = require('express-rate-limit');

/**
 * apiLimiter
 * Applied to all /api/* routes.
 * Allows 100 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,  // Return `RateLimit-*` headers (RFC 6585)
    legacyHeaders: false,   // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
});

/**
 * authLimiter
 * Applied to /api/auth/login and /api/auth/register.
 * Stricter: 10 attempts per 15-minute window.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes',
    },
});

module.exports = { apiLimiter, authLimiter };
