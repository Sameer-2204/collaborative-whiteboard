/**
 * models/User.js
 * ─────────────────────────────────────────────
 * Mongoose schema for an authenticated User.
 *
 * Fields  : name, email, password, avatar, role,
 *           themePreference, isActive, timestamps
 * Hooks   : pre-save  → bcrypt hash password if modified
 * Methods : matchPassword(candidate) → boolean
 *           generateAuthToken()     → signed JWT string
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
    {
        // ── Display name ──────────────────────────────────────
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },

        // ── Authentication ────────────────────────────────────
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
            index: true,
        },

        // Stored as a bcrypt hash – never returned in queries (select: false)
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },

        // ── Profile ───────────────────────────────────────────
        // Optional avatar URL (uploaded asset or Gravatar)
        avatar: {
            type: String,
            default: '',
        },

        // UI colour theme preference
        themePreference: {
            type: String,
            enum: ['dark', 'light', 'system'],
            default: 'dark',
        },

        // ── Access control ────────────────────────────────────
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },

        // Soft-delete flag – deactivated users cannot log in
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Pre-save hook: hash password ─────────────────────────────────
// Only runs when the password field is new or has been modified.
// This covers both create and password-change scenarios.
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12); // cost factor 12
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// ── Instance method: compare plain password with stored hash ─────
/**
 * matchPassword
 * @param {string} candidatePassword – plain-text password from login form
 * @returns {Promise<boolean>}
 */
UserSchema.methods.matchPassword = async function (candidatePassword) {
    // `this.password` is the hashed value (must be explicitly selected)
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: generate signed JWT ─────────────────────────
/**
 * generateAuthToken
 * Signs a JWT containing the user's id and role.
 * Expiry is controlled by JWT_EXPIRES_IN env var (default 7d).
 * @returns {string} signed JWT
 */
UserSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            role: this.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

module.exports = mongoose.model('User', UserSchema);
