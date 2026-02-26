/* ──────────────────────────────────────────────────────────────
   src/services/axiosInstance.js
   Pre-configured Axios client used by all service modules.

   Features:
     - baseURL from VITE_SERVER_URL env var (falls back to localhost)
     - Request interceptor: injects Bearer token from localStorage
     - Response interceptor: handles 401 → redirect to /login
   ────────────────────────────────────────────────────────────── */

import axios from 'axios';

/* ── Create instance ────────────────────────────────────────── */
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL
        ? `${import.meta.env.VITE_SERVER_URL}/api`
        : 'http://localhost:5000/api',
    timeout: 10_000,                        // 10 s request timeout
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,                  // send cookies on cross-origin
});

/* ── Request interceptor – attach JWT ───────────────────────── */
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('wb_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ── Response interceptor – handle auth errors ──────────────── */
axiosInstance.interceptors.response.use(
    (response) => response,                 // 2xx – pass straight through
    (error) => {
        if (error.response?.status === 401) {
            // Token expired / invalid – clear storage and redirect
            localStorage.removeItem('wb_token');
            // Use window.location so we don't need to import the router here
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
