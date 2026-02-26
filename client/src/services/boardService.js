/* ──────────────────────────────────────────────────────────────
   src/services/boardService.js
   All HTTP calls related to Whiteboard boards.

   TODO (Phase 2): implement each function body.
   ────────────────────────────────────────────────────────────── */

import axiosInstance from './axiosInstance';

const boardService = {
    /**
     * getBoards
     * GET /api/boards
     * @returns {{ data: Board[] }}
     */
    getBoards: async () => {
        // TODO: const res = await axiosInstance.get('/boards');
        // return res.data;
        throw new Error('boardService.getBoards – not implemented yet');
    },

    /**
     * getBoardById
     * GET /api/boards/:id
     * @param {string} id
     * @returns {{ data: Board }}
     */
    getBoardById: async (id) => {
        // TODO: const res = await axiosInstance.get(`/boards/${id}`);
        // return res.data;
        throw new Error('boardService.getBoardById – not implemented yet');
    },

    /**
     * createBoard
     * POST /api/boards
     * @param {{ name, visibility }} data
     * @returns {{ data: Board }}
     */
    createBoard: async (data) => {
        // TODO: const res = await axiosInstance.post('/boards', data);
        // return res.data;
        throw new Error('boardService.createBoard – not implemented yet');
    },

    /**
     * updateBoard
     * PUT /api/boards/:id
     * @param {string} id
     * @param {object} data
     * @returns {{ data: Board }}
     */
    updateBoard: async (id, data) => {
        // TODO: const res = await axiosInstance.put(`/boards/${id}`, data);
        // return res.data;
        throw new Error('boardService.updateBoard – not implemented yet');
    },

    /**
     * deleteBoard
     * DELETE /api/boards/:id
     * @param {string} id
     */
    deleteBoard: async (id) => {
        // TODO: await axiosInstance.delete(`/boards/${id}`);
        throw new Error('boardService.deleteBoard – not implemented yet');
    },
};

export default boardService;
