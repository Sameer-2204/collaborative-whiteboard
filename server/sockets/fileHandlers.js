/**
 * sockets/fileHandlers.js
 * ─────────────────────────────────────────────
 * Relays file-shared notifications to all room members.
 *
 * The actual file upload is handled by the REST route
 * POST /api/rooms/:roomId/files  (Express + multer).
 * After a successful upload, the client emits file:share
 * with the metadata returned by the REST endpoint.
 * This handler broadcasts it to all other room members.
 *
 * Event catalogue
 * ──────────────────────────────────────────────────────
 * Client emits      Payload                  Server action
 * ───────────────   ─────────────────────    ─────────────────────────────────
 * file:share        { fileId, url, name,     broadcast file:shared to room
 *                    mimeType, size }
 */

const SharedFile = require('../models/SharedFile');

/**
 * fileHandlers
 * @param {import('socket.io').Namespace} namespace
 * @param {import('socket.io').Socket}    socket
 */
const fileHandlers = (namespace, socket) => {
    const { user } = socket.data;

    // ─────────────────────────────────────────────────────────────
    //  file:share  – client announces a newly uploaded file
    // ─────────────────────────────────────────────────────────────
    socket.on('file:share', ({ fileId, url, name, mimeType, size } = {}) => {
        if (!socket.data.roomKey) return;
        if (!url || !name || !mimeType) return; // basic guard

        const payload = {
            fileId,
            url,
            name,
            mimeType,
            size,
            sharedBy: { id: user.id, name: user.name },
            sharedAt: new Date().toISOString(),
        };

        // Broadcast to everyone else in the room
        socket.to(socket.data.roomKey).emit('file:shared', payload);

        // Emit back to the sender too (so their own file list updates)
        socket.emit('file:shared', payload);

        console.log(`📎  ${user.name} shared "${name}" in room ${socket.data.roomId}`);
    });

    // ─────────────────────────────────────────────────────────────
    //  file:list:request  — client asks for history on room join
    //  (backup: REST GET /api/rooms/:roomId/files is preferred)
    // ─────────────────────────────────────────────────────────────
    socket.on('file:list:request', async () => {
        if (!socket.data.roomId) return;
        try {
            const files = await SharedFile.forRoom(socket.data.roomId);
            socket.emit('file:list', files.map(f => ({
                fileId: f._id.toString(),
                url: f.url,
                name: f.originalName,
                mimeType: f.mimeType,
                size: f.size,
                sharedBy: f.uploadedBy,
                sharedAt: f.createdAt.toISOString(),
            })));
        } catch (err) {
            console.error('file:list:request error:', err);
        }
    });
};

module.exports = fileHandlers;
