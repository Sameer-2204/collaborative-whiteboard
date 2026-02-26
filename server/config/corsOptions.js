/**
 * config/corsOptions.js
 * ─────────────────────────────────────────────
 * Centralises CORS policy for the Express app.
 *
 * CLIENT_URL in .env accepts one or more comma-separated origins:
 *
 *   Development (single origin):
 *     CLIENT_URL=http://localhost:3000
 *
 *   Production (multiple: Vercel + custom domain):
 *     CLIENT_URL=https://myapp.vercel.app,https://myapp.com,https://www.myapp.com
 *
 * In development mode, all origins are permitted so that tools
 * like Postman and the Vite dev server work without friction.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Parse the comma-separated CLIENT_URL into an array of trimmed origins
const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:4173']; // Vite dev + preview

const corsOptions = {
    /**
     * origin callback:
     *  - In development: allow all origins (no config needed for local work)
     *  - In production:  only origins in CLIENT_URL  are allowed
     *  - Requests with no Origin header (Postman, same-origin): always allowed
     */
    origin: (origin, callback) => {
        // Allow requests with no Origin header (e.g. mobile apps, Postman, SSR)
        if (!origin) {
            return callback(null, true);
        }

        // In development, be permissive to avoid friction
        if (!isProduction) {
            return callback(null, true);
        }

        // In production, enforce the allowlist
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error(`CORS blocked: origin "${origin}" is not in the allowed list.\nAllowed: ${allowedOrigins.join(', ')}`));
    },

    // Required for cookies / Authorization headers in cross-origin requests
    credentials: true,

    // Expose commonly-needed response headers to the browser
    exposedHeaders: ['Content-Disposition'],

    // Allowed request headers
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

    // HTTP methods permitted
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Cache pre-flight response for 10 minutes
    maxAge: 600,

    // Respond 200 to OPTIONS (some legacy clients expect this)
    optionsSuccessStatus: 200,
};

module.exports = corsOptions;
