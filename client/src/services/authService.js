/* ──────────────────────────────────────────────────────────────
   src/services/authService.js
   All HTTP calls related to user authentication.
   Uses the shared axiosInstance (JWT header auto-injected).
   ────────────────────────────────────────────────────────────── */

import axiosInstance from './axiosInstance';

const authService = {
    /**
     * register
     * POST /api/auth/register
     * @param {{ name, email, password }} data
     * @returns {{ success, token, data: { user } }}
     */
    register: async (data) => {
        const res = await axiosInstance.post('/auth/register', data);
        return res.data;
    },

    /**
     * login
     * POST /api/auth/login
     * @param {{ email, password }} credentials
     * @returns {{ success, token, data: { user } }}
     */
    login: async (credentials) => {
        const res = await axiosInstance.post('/auth/login', credentials);
        return res.data;
    },

    /**
     * logout
     * POST /api/auth/logout
     */
    logout: async () => {
        await axiosInstance.post('/auth/logout');
    },

    /**
     * getMe
     * GET /api/auth/me
     * @returns {{ success, data: { user } }}
     */
    getMe: async () => {
        const res = await axiosInstance.get('/auth/me');
        return res.data;
    },
};

export default authService;
