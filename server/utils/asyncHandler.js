/**
 * utils/asyncHandler.js
 * ─────────────────────────────────────────────
 * Higher-order function that wraps an async Express route handler,
 * catching any unhandled promise rejections and forwarding them to
 * Express's next(err) so the central errorHandler middleware picks
 * them up.
 *
 * Usage:
 *   const asyncHandler = require('../utils/asyncHandler');
 *   const getBoards = asyncHandler(async (req, res, next) => { ... });
 *
 * This eliminates the need for try/catch blocks in every controller.
 */

/**
 * @param {Function} fn – async Express route handler
 * @returns {Function}   Express middleware that catches rejections
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
