/**
 * middleware/errorHandler.js
 * ─────────────────────────────────────────────
 * Central error-handling middleware for Express.
 *
 * Must be registered LAST in server.js (after all routes)
 * so Express routes errors to this handler.
 *
 * Custom errors thrown anywhere with `next(error)` or
 * thrown inside async controllers (wrapped with asyncHandler)
 * will all funnel through here for a consistent JSON response.
 */

/**
 * formatMongooseErrors
 * Converts Mongoose validation / cast errors into
 * human-readable messages for the API consumer.
 */
const formatMongooseErrors = (err) => {
    // Duplicate key (e.g. unique email already exists)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return {
            statusCode: 409,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        };
    }

    // Validation error (required fields, min/max, match, etc.)
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return { statusCode: 400, message: messages.join('. ') };
    }

    // Invalid ObjectId (e.g. /boards/not-a-valid-id)
    if (err.name === 'CastError') {
        return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}` };
    }

    return null;
};

/**
 * errorHandler
 * Express error-handling middleware signature: (err, req, res, next)
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const mongooseFormatted = formatMongooseErrors(err);

    const statusCode = mongooseFormatted?.statusCode || err.statusCode || 500;
    const message =
        mongooseFormatted?.message ||
        err.message ||
        'An unexpected server error occurred';

    // Log full stack in non-production environments
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[ErrorHandler] ${statusCode} – ${message}`);
        if (err.stack) console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Expose stack only during development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
