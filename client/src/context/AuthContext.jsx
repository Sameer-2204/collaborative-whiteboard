/* ──────────────────────────────────────────────────────────────
   src/context/AuthContext.jsx
   Global authentication state – user, token, loading.

   On mount: verifies stored JWT via GET /api/auth/me.
   Exposes: login(), register(), logout() + isAuthenticated flag.
   ────────────────────────────────────────────────────────────── */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('wb_token'));

    /* ── Persist / rehydrate token ─────────────────────────── */
    const saveToken = (t) => { localStorage.setItem('wb_token', t); setToken(t); };
    const clearToken = () => { localStorage.removeItem('wb_token'); setToken(null); };

    /* ── Verify stored token on first mount ────────────────── */
    useEffect(() => {
        const verifyStoredToken = async () => {
            const token = localStorage.getItem('wb_token');
            if (!token) { setIsLoading(false); return; }
            try {
                const res = await authService.getMe();
                setUser(res.data.user);
            } catch {
                // Token expired or invalid – clear silently
                clearToken();
            } finally {
                setIsLoading(false);
            }
        };
        verifyStoredToken();
    }, []);

    /* ── login ──────────────────────────────────────────────── */
    const login = useCallback(async (credentials) => {
        setError(null);
        const res = await authService.login(credentials);
        saveToken(res.token);
        setUser(res.data.user);
    }, []);

    /* ── register ───────────────────────────────────────────── */
    const register = useCallback(async (data) => {
        setError(null);
        const res = await authService.register(data);
        saveToken(res.token);
        setUser(res.data.user);
    }, []);

    /* ── logout ─────────────────────────────────────────────── */
    const logout = useCallback(async () => {
        try { await authService.logout(); } catch { /* ignore */ }
        clearToken();
        setUser(null);
        setToken(null);       // clear token state → SocketContext disconnects
    }, []);

    const value = {
        user,
        token,                // ← exposed so SocketContext can use it
        isLoading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
}

export default AuthContext;
