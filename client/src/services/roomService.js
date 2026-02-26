/* ──────────────────────────────────────────────────────────────
   src/services/roomService.js
   HTTP calls for room management (/api/rooms).
   ────────────────────────────────────────────────────────────── */

import axiosInstance from './axiosInstance';

const roomService = {
    /** POST /api/rooms — create a room, returns { room } */
    create: async ({ name = '', maxParticipants = 10 } = {}) => {
        const res = await axiosInstance.post('/rooms', { name, maxParticipants });
        return res.data;      // { success, data: { room } }
    },

    /** GET /api/rooms — rooms the current user belongs to */
    getMyRooms: async () => {
        const res = await axiosInstance.get('/rooms');
        return res.data;      // { success, count, data: { rooms } }
    },

    /** GET /api/rooms/:roomId — single room details */
    getById: async (roomId) => {
        const res = await axiosInstance.get(`/rooms/${roomId}`);
        return res.data;
    },

    /** POST /api/rooms/:roomId/join */
    join: async (roomId) => {
        const res = await axiosInstance.post(`/rooms/${roomId}/join`);
        return res.data;      // { success, data: { room, role } }
    },

    /** POST /api/rooms/:roomId/leave */
    leave: async (roomId) => {
        const res = await axiosInstance.post(`/rooms/${roomId}/leave`);
        return res.data;
    },

    /** DELETE /api/rooms/:roomId — host only */
    close: async (roomId) => {
        const res = await axiosInstance.delete(`/rooms/${roomId}`);
        return res.data;
    },
};

export default roomService;
