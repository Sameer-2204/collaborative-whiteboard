/**
 * sockets/screenHandlers.js
 * ─────────────────────────────────────────────
 * WebRTC screen-share signaling relay.
 *
 * The server NEVER touches media, SDP, or ICE internals.
 * It only routes messages between the correct socket IDs.
 *
 * Signaling flow:
 *   1. Host starts share    → broadcast screen:available to room
 *   2. Participant requests → relay screen:request to host
 *   3. Host sends offer     → relay screen:offer to participant
 *   4. Participant answers  → relay screen:answer to host
 *   5. ICE candidates       → relay in both directions
 *   6. Host stops / leaves  → broadcast screen:stopped to room
 *
 * Event Catalogue
 * ─────────────────────────────────────────────────────────────────
 * Client emits                 Payload                Server action
 * ─────────────────────────    ────────────────────   ───────────────────────────
 * screen:start                 —                      broadcast screen:available
 * screen:stop                  —                      broadcast screen:stopped
 * screen:request               { hostSocketId }       relay → host as screen:request { from }
 * screen:offer                 { to, sdp }            relay → to   as screen:offer   { from, sdp }
 * screen:answer                { to, sdp }            relay → to   as screen:answer  { from, sdp }
 * screen:ice                   { to, candidate }      relay → to   as screen:ice     { from, candidate }
 */

/**
 * screenHandlers
 * @param {import('socket.io').Namespace} namespace
 * @param {import('socket.io').Socket}    socket
 */
const screenHandlers = (namespace, socket) => {
    const { user } = socket.data;

    // ─────────────────────────────────────────────────────────────
    //  screen:start  — host announces they are about to share
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:start', () => {
        if (!socket.data.roomKey) return;

        socket.to(socket.data.roomKey).emit('screen:available', {
            hostSocketId: socket.id,
            host: { id: user.id, name: user.name },
        });

        // Persist on socket so we can auto-broadcast screen:stopped on disconnect
        socket.data.isSharing = true;

        console.log(`📺  ${user.name} started screen share in ${socket.data.roomId}`);
    });

    // ─────────────────────────────────────────────────────────────
    //  screen:stop  — host explicitly stops
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:stop', () => {
        if (!socket.data.roomKey) return;

        _broadcastStopped(socket, namespace, user);
    });

    // ─────────────────────────────────────────────────────────────
    //  screen:request  — participant asks for an offer from the host
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:request', ({ hostSocketId } = {}) => {
        if (!hostSocketId) return;

        // Tell the host to create an offer for this participant
        namespace.to(hostSocketId).emit('screen:request', {
            from: socket.id,
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  screen:offer  — host → participant
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:offer', ({ to, sdp } = {}) => {
        if (!to || !sdp) return;

        namespace.to(to).emit('screen:offer', {
            from: socket.id,
            sdp,
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  screen:answer  — participant → host
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:answer', ({ to, sdp } = {}) => {
        if (!to || !sdp) return;

        namespace.to(to).emit('screen:answer', {
            from: socket.id,
            sdp,
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  screen:ice  — relay ICE candidates in both directions
    // ─────────────────────────────────────────────────────────────
    socket.on('screen:ice', ({ to, candidate } = {}) => {
        if (!to || candidate === undefined) return;

        namespace.to(to).emit('screen:ice', {
            from: socket.id,
            candidate,
        });
    });

    // ─────────────────────────────────────────────────────────────
    //  disconnect cleanup — if host disconnects mid-share
    // ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (socket.data.isSharing && socket.data.roomKey) {
            _broadcastStopped(socket, namespace, user);
        }
    });
};

// ── Shared helper ─────────────────────────────────────────────────
function _broadcastStopped(socket, namespace, user) {
    socket.data.isSharing = false;
    socket.to(socket.data.roomKey).emit('screen:stopped', {
        hostSocketId: socket.id,
    });
    console.log(`📺  ${user.name} stopped screen share in ${socket.data.roomId}`);
}

module.exports = screenHandlers;
