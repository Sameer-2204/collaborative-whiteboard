/* ──────────────────────────────────────────────────────────────
   src/utils/helpers.js
   General-purpose utility functions used across the app.

   Add domain-specific helpers here as Phase 2 features are built.
   ────────────────────────────────────────────────────────────── */

/**
 * formatDate
 * Converts an ISO date string to a human-readable format.
 * @param {string} isoString
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(isoString, options = {}) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
    }).format(new Date(isoString));
}

/**
 * generateShareLink
 * Builds a shareable board URL from a board ID.
 * @param {string} boardId
 * @returns {string}
 */
export function generateShareLink(boardId) {
    return `${window.location.origin}/board/${boardId}`;
}

/**
 * truncate
 * Truncates a string to the given length and appends '…'.
 * @param {string} str
 * @param {number} [maxLength=30]
 * @returns {string}
 */
export function truncate(str, maxLength = 30) {
    if (!str) return '';
    return str.length <= maxLength ? str : `${str.slice(0, maxLength)}…`;
}

/**
 * classNames
 * Conditionally joins CSS class names (lightweight clsx alternative).
 * @param  {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}
