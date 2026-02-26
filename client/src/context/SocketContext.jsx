/* ──────────────────────────────────────────────────────────────
   src/context/SocketContext.jsx
   Manages a single Socket.io client connection per auth session.

   Design:
   - Socket connects lazily, only after a JWT token exists
   - Token is passed in the handshake auth object (server validates it)
   - Reconnects automatically when token changes (user logs in/out)
   - Exposes typed emitter helpers so components never raw-emit

   FIX: socket is now stored as React state (not just a ref)
   so that consumers re-render correctly when the socket connects.
   ────────────────────────────────────────────────────────────── */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SERVER_URL } from '../utils/constants';

const NAMESPACE = '/whiteboard';

/* ── Context ─────────────────────────────────────────────────── */
const SocketContext = createContext(null);

/* ── Provider ────────────────────────────────────────────────── */
export function SocketProvider({ children }) {
    const { token } = useAuth();           // token from AuthContext
    const socketRef = useRef(null);

    // socket is stored as state so consumers re-render when it connects
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect when we have a valid JWT
        if (!token) {
            // Clean up any stale socket on logout
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setSocket(null);
            setIsConnected(false);
            return;
        }

        // Create socket with JWT in handshake auth
        const newSocket = io(`${SERVER_URL}${NAMESPACE}`, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,
            withCredentials: true,
        });

        socketRef.current = newSocket;

        // Expose the socket instance to consumers immediately so that
        // they can attach their own event listeners before `connect` fires.
        setSocket(newSocket);

        // ── Lifecycle listeners ───────────────────────────────────
        newSocket.on('connect', () => {
            console.log(`🔌  Socket connected  –  ${newSocket.id}`);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`🔌  Socket disconnected  –  ${reason}`);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error(`🔌  Socket error:  ${err.message}`);
        });

        return () => {
            newSocket.disconnect();
            newSocket.removeAllListeners();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        };
    }, [token]); // reconnect whenever token changes

    // ── Typed emit helpers ────────────────────────────────────────
    /* Components should use these instead of calling socket.emit directly.
       This keeps the event contract in one place and makes refactoring safe. */

    const joinRoom = useCallback((roomId) => {
        socketRef.current?.emit('join_room', { roomId });
    }, []);

    const leaveRoom = useCallback((roomId) => {
        socketRef.current?.emit('leave_room', { roomId });
    }, []);

    const sendDraw = useCallback((stroke) => {
        socketRef.current?.emit('draw', stroke);
    }, []);

    const sendErase = useCallback((stroke) => {
        socketRef.current?.emit('erase', stroke);
    }, []);

    const clearBoard = useCallback(() => {
        socketRef.current?.emit('clear_board');
    }, []);

    const sendUndo = useCallback(() => {
        socketRef.current?.emit('undo');
    }, []);

    const sendRedo = useCallback(() => {
        socketRef.current?.emit('redo');
    }, []);

    const sendMessage = useCallback((roomId, text) => {
        socketRef.current?.emit('send_message', { roomId, text });
    }, []);

    const sendCursor = useCallback((x, y) => {
        socketRef.current?.emit('cursor:move', { x, y });
    }, []);

    // ── Context value ─────────────────────────────────────────────
    const value = {
        socket,          // ← reactive state (not socketRef.current)
        isConnected,
        // Typed emitters
        joinRoom,
        leaveRoom,
        sendDraw,
        sendErase,
        clearBoard,
        sendUndo,
        sendRedo,
        sendMessage,
        sendCursor,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

/* ── Hook ────────────────────────────────────────────────────── */
export function useSocket() {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within <SocketProvider>');
    return ctx;
}

export default SocketContext;
