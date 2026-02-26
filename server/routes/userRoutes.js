/**
 * routes/userRoutes.js
 * ─────────────────────────────────────────────
 * Protected routes scoped to authenticated users.
 * Base path: /api/users  (mounted in server.js)
 *
 * This file acts as the canonical example of how to
 * use the `protect` and `authorise` middleware guards
 * on any route in the application.
 *
 * Method  Path        Handler          Guards
 * ──────  ──────────  ───────────────  ─────────────────────────
 * GET     /profile    getProfile       protect
 * PUT     /profile    updateProfile    protect
 * GET     /           getAllUsers      protect + authorise('admin')
 * DELETE  /:id        deleteUser       protect + authorise('admin')
 */

const express = require('express');
const router = express.Router();

const { protect, authorise } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/ApiResponse');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────
//  GET /api/users/profile  –  protected: any authenticated user
// ─────────────────────────────────────────────────────────────────

/**
 * getProfile
 * Returns the profile of the requesting user.
 * req.user is already set by the protect middleware.
 *
 * Example request:
 *   GET /api/users/profile
 *   Authorization: Bearer <jwt>
 */
const getProfile = asyncHandler(async (req, res) => {
    // req.user is the full Mongoose document attached by protect
    const { _id, name, email, avatar, role, themePreference, createdAt } = req.user;

    res.status(200).json({
        success: true,
        data: {
            user: { _id, name, email, avatar, role, themePreference, createdAt },
        },
    });
});

// ─────────────────────────────────────────────────────────────────
//  PUT /api/users/profile  –  protected: any authenticated user
// ─────────────────────────────────────────────────────────────────

/**
 * updateProfile
 * Allows a user to update their own name and avatar.
 * Email and password changes require separate, secure flows.
 *
 * Body: { name?, avatar? }
 */
const updateProfile = asyncHandler(async (req, res, next) => {
    const allowedUpdates = ['name', 'avatar'];
    const updates = {};

    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
        return next(new ApiError('No valid fields provided for update', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
    });
});

// ─────────────────────────────────────────────────────────────────
//  GET /api/users  –  admin only
// ─────────────────────────────────────────────────────────────────

/**
 * getAllUsers
 * Admin-only: lists all users in the system.
 * Demonstrates chaining protect + authorise('admin').
 *
 * Example request:
 *   GET /api/users
 *   Authorization: Bearer <admin-jwt>
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: users.length,
        data: { users },
    });
});

// ─────────────────────────────────────────────────────────────────
//  DELETE /api/users/:id  –  admin only
// ─────────────────────────────────────────────────────────────────

/**
 * deleteUser
 * Admin-only: soft-deletes a user account by setting isActive = false.
 */
const deleteUser = asyncHandler(async (req, res, next) => {
    // Prevent admin from deactivating their own account
    if (req.params.id === req.user.id) {
        return next(new ApiError('You cannot deactivate your own account', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
    );

    if (!user) {
        return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
        success: true,
        message: `User ${user.email} has been deactivated`,
    });
});

// ─────────────────────────────────────────────────────────────────
//  Route declarations
// ─────────────────────────────────────────────────────────────────

// Authenticated user routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin-only routes (protect runs first, then authorise checks role)
router.get('/', protect, authorise('admin'), getAllUsers);
router.delete('/:id', protect, authorise('admin'), deleteUser);

module.exports = router;
