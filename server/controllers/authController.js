/**
 * controllers/authController.js
 * ─────────────────────────────────────────────
 * Handles user registration, login, token refresh,
 * logout, and profile retrieval.
 *
 * All handlers use asyncHandler so promise rejections
 * are forwarded to the global error handler automatically.
 *
 * Response shape (success):
 *   { success: true, token: "...", data: { user } }
 *
 * Response shape (error) — handled by errorHandler.js:
 *   { success: false, message: "..." }
 */

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiResponse');

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * sendTokenResponse
 * Generates a JWT, optionally sets an HttpOnly cookie (Phase 2),
 * and returns a consistent JSON payload.
 *
 * @param {Document} user       – Mongoose User document
 * @param {number}   statusCode – HTTP status to send (201 or 200)
 * @param {object}   res        – Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.generateAuthToken();

    // Build the safe user object (no password field)
    const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        themePreference: user.themePreference,
        createdAt: user.createdAt,
    };

    // Optional: set HttpOnly cookie for enhanced security
    // res.cookie('token', token, {
    //   httpOnly: true,
    //   secure  : process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge  : 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    // });

    res.status(statusCode).json({
        success: true,
        token,
        data: { user: userData },
    });
};

// ─────────────────────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────────────────────

/**
 * register
 * Creates a new user account and returns a JWT.
 *
 * Body: { name, email, password }
 *
 * Validates:
 *  - All required fields present
 *  - Email not already registered (Mongoose unique index → 11000)
 *  - Password length ≥ 6 (Mongoose validator)
 */
const register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    // ── 1. Basic presence check ──────────────────────────────────
    if (!name || !email || !password) {
        return next(new ApiError('Please provide name, email and password', 400));
    }

    // ── 2. Check for duplicate email ─────────────────────────────
    // (Mongoose will also throw a 11000 duplicate error which
    //  the central errorHandler maps to 409, but an early check
    //  gives a cleaner message.)
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
        return next(new ApiError('An account with this email already exists', 409));
    }

    // ── 3. Create user (password is hashed by the pre-save hook) ─
    const user = await User.create({ name, email, password });

    // ── 4. Respond with token ────────────────────────────────────
    sendTokenResponse(user, 201, res);
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────────────

/**
 * login
 * Validates credentials and returns a JWT.
 *
 * Body: { email, password }
 *
 * Security note:
 *  - Always use the same generic error message for missing fields
 *    AND wrong credentials to avoid user-enumeration attacks.
 */
const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // ── 1. Presence check ────────────────────────────────────────
    if (!email || !password) {
        return next(new ApiError('Please provide email and password', 400));
    }

    // ── 2. Find user and explicitly select the password hash ─────
    //  `select: false` on the schema means we must opt-in here.
    const user = await User.findOne({ email: email.toLowerCase().trim() })
        .select('+password');

    // ── 3. Verify user exists ────────────────────────────────────
    if (!user) {
        return next(new ApiError('Invalid credentials', 401));
    }

    // ── 4. Check active status ───────────────────────────────────
    if (!user.isActive) {
        return next(new ApiError('This account has been deactivated', 403));
    }

    // ── 5. Compare password ──────────────────────────────────────
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return next(new ApiError('Invalid credentials', 401));
    }

    // ── 6. Issue token ───────────────────────────────────────────
    sendTokenResponse(user, 200, res);
});

// ─────────────────────────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────

/**
 * logout
 * Stateless JWT: clears the cookie if set.
 * The client is responsible for deleting the token from storage.
 *
 * For server-side token invalidation, implement a Redis blocklist
 * and check it inside the `protect` middleware.
 */
const logout = asyncHandler(async (req, res) => {
    // Clear HttpOnly cookie if used
    // res.cookie('token', '', { httpOnly: true, expires: new Date(0) });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/auth/me
// ─────────────────────────────────────────────────────────────────

/**
 * getMe
 * Returns the profile of the currently authenticated user.
 * req.user is attached by the `protect` middleware.
 */
const getMe = asyncHandler(async (req, res, next) => {
    // req.user.id comes from the decoded JWT payload (protect middleware)
    const user = await User.findById(req.user.id);

    if (!user) {
        return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: { user },
    });
});

// ─────────────────────────────────────────────────────────────────
//  PUT /api/auth/me/theme
// ─────────────────────────────────────────────────────────────────

/**
 * updateTheme
 * Updates the authenticated user's UI theme preference.
 * Body: { themePreference: 'dark' | 'light' | 'system' }
 */
const updateTheme = asyncHandler(async (req, res, next) => {
    const { themePreference } = req.body;
    const allowed = ['dark', 'light', 'system'];

    if (!allowed.includes(themePreference)) {
        return next(new ApiError(`themePreference must be one of: ${allowed.join(', ')}`, 400));
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { themePreference },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: { user },
    });
});

module.exports = { register, login, logout, getMe, updateTheme };
