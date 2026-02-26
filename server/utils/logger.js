/**
 * utils/logger.js
 * ─────────────────────────────────────────────
 * Application-level logger powered by `winston`.
 * Outputs structured JSON in production and pretty
 * coloured text in development.
 *
 * Requires: npm install winston
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started');
 *   logger.error('Database error', { err });
 */

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

// ── Development format: colourised, single-line readability ────
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ timestamp: ts, level, message, stack }) =>
        stack
            ? `[${ts}] ${level}: ${message}\n${stack}`
            : `[${ts}] ${level}: ${message}`
    )
);

// ── Production format: structured JSON for log aggregators ─────
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    format.json()
);

const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        // Uncomment to persist logs to files in production:
        // new transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new transports.File({ filename: 'logs/combined.log' }),
    ],
});

module.exports = logger;
