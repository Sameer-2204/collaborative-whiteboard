/* ──────────────────────────────────────────────────────────────
   src/utils/constants.js
   App-level constants and configuration values.
   Import from here instead of hardcoding strings in components.
   ────────────────────────────────────────────────────────────── */

/* API / Socket */
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
export const API_BASE = `${SERVER_URL}/api`;

/* Routes */
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    BOARD: (id = ':boardId') => `/board/${id}`,
    ROOM: (id = ':roomId') => `/room/${id}`,
};

/* Whiteboard tool types (used in Phase 2) */
export const TOOLS = {
    PEN: 'pen',
    ERASER: 'eraser',
    LINE: 'line',
    RECT: 'rect',
    ELLIPSE: 'ellipse',
    TEXT: 'text',
    SELECT: 'select',
};

/* Default canvas settings */
export const CANVAS_DEFAULTS = {
    STROKE_COLOR: '#1a1a2e',
    STROKE_WIDTH: 3,
    FILL_COLOR: 'transparent',
    BACKGROUND: '#ffffff',
};

/* Board visibility options */
export const VISIBILITY = {
    PRIVATE: 'private',
    PUBLIC: 'public',
    LINK: 'link',
};
