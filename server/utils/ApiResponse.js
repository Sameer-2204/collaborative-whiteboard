/**
 * utils/ApiResponse.js
 * ─────────────────────────────────────────────
 * Utility class that creates a consistent JSON response shape
 * for all successful API responses.
 *
 * Pair with errorHandler.js, which handles the failure case.
 *
 * Shape:
 * {
 *   success : true,
 *   message : string,
 *   data    : any,
 *   meta    : { page, limit, total } | undefined
 * }
 *
 * Usage in a controller:
 *   const { ApiResponse } = require('../utils/ApiResponse');
 *   res.status(200).json(new ApiResponse('Boards fetched', boards, meta));
 */

class ApiResponse {
    /**
     * @param {string} message – human-readable success message
     * @param {*}      data    – payload returned to the client
     * @param {object} [meta] – optional pagination / extra metadata
     */
    constructor(message = 'Success', data = null, meta = undefined) {
        this.success = true;
        this.message = message;
        this.data = data;
        if (meta !== undefined) this.meta = meta;
    }
}

/**
 * ApiError
 * ─────────────────────────────────────────────
 * Custom Error subclass that carries an HTTP status code.
 * Throw this anywhere and the errorHandler middleware will
 * map it to the correct HTTP status.
 *
 * Usage:
 *   throw new ApiError('Board not found', 404);
 */
class ApiError extends Error {
    /**
     * @param {string} message    – error description
     * @param {number} statusCode – HTTP status code (default 500)
     */
    constructor(message = 'Server Error', statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        // Capture stack trace (V8 only) without including the constructor call
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { ApiResponse, ApiError };
