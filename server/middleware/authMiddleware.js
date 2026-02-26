/**
 * middleware/authMiddleware.js
 * ─────────────────────────────────────────────
 * JWT-based authentication and role-authorisation guards.
 *
 * Usage:
 *   router.get('/boards', protect, boardController.getBoards)
 *   router.delete('/admin', protect, authorise('admin'), handler)
 *
 * protect flow:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify JWT signature using JWT_SECRET
 *   3. Check token expiry (jwt.verify handles this)
 *   4. Fetch user from DB – confirms the user still exists & is active
 *   5. Attach full user document to req.user
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────────
//  protect
// ─────────────────────────────────────────────────────────────────

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Extract token from Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Optionally also support HttpOnly cookie (uncomment if using cookie auth)
    // else if (req.cookies?.token) {
    //   token = req.cookies.token;
    // }

    if (!token) {
        return next(new ApiError('Not authorised – no token provided', 401));
    }

    // 2. Verify token signature and expiry
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        // jwt.JsonWebTokenError  → tampered / invalid signature
        // jwt.TokenExpiredError  → token has expired
        const message =
            err.name === 'TokenExpiredError'
                ? 'Session expired – please log in again'
                : 'Not authorised – invalid token';
        return next(new ApiError(message, 401));
    }

    // 3. Look up the user by id from the decoded payload
    const user = await User.findById(decoded.id);

    if (!user) {
        return next(new ApiError('User belonging to this token no longer exists', 401));
    }

    // 4. Reject deactivated accounts
    if (user.isActive === false) {
        return next(new ApiError('This account has been deactivated', 403));
    }

    // 5. Attach user to request for downstream handlers
    req.user = user;
    next();
});

// ─────────────────────────────────────────────────────────────────
//  authorise  (role-based guard, use AFTER protect)
// ─────────────────────────────────────────────────────────────────

/**
 * authorise
 * Accepts a list of allowed roles.
 * Must be used AFTER protect so req.user is set.
 *
 * Example:
 *   router.delete('/users/:id', protect, authorise('admin'), deleteUser)
 *
 * @param {...string} roles – allowed role strings
 */
const authorise = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return next(
            new ApiError(
                `Role '${req.user?.role}' is not permitted to access this route`,
                403
            )
        );
    }
    next();
};

module.exports = { protect, authorise };
