/* ──────────────────────────────────────────────────────────────
   src/pages/WhiteboardRoom.jsx
   Collaborative whiteboard with persistence, image download,
   and a save-before-leave navigation guard.

   Persistence additions vs previous version:
   ─ Listen for canvas:restore → replayStrokes() on join
   ─ useBlocker() intercepts React-Router navigation
   ─ window beforeunload warns browser-level exits
   ─ SaveModal shown when navigation is blocked
   ─ "Download PNG" button in the header bar
   ────────────────────────────────────────────────────────────── */

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Toolbar from '../components/Toolbar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import SaveModal from '../components/SaveModal.jsx';
import ScreenShareOverlay from '../components/ScreenShareOverlay.jsx';
import FileSharePanel from '../components/FileSharePanel.jsx';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import useDrawing from '../hooks/useDrawing';
import useScreenShare from '../hooks/useScreenShare';
import useFileShare from '../hooks/useFileShare';
import { ROUTES } from '../utils/constants';
import roomService from '../services/roomService';

const CANVAS_W = 1600;
const CANVAS_H = 900;

// ── Custom canvas cursors with precise centre hotspot ────────────
// The two SVG data-URI cursors declare hotspot at exact centre (12 12)
// so drawing hits exactly where the crosshair lines intersect.
const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='0' x2='12' y2='24' stroke='%23333' stroke-width='1.5'/%3E%3Cline x1='0' y1='12' x2='24' y2='12' stroke='%23333' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%23333'/%3E%3C/svg%3E") 12 12, crosshair`;

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' stroke='%23555' stroke-width='1.5' fill='none'/%3E%3Cline x1='12' y1='0' x2='12' y2='24' stroke='%23555' stroke-width='1.2'/%3E%3Cline x1='0' y1='12' x2='24' y2='12' stroke='%23555' stroke-width='1.2'/%3E%3C/svg%3E") 12 12, cell`;

export default function WhiteboardRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const {
        socket,
        isConnected,
        joinRoom,
        leaveRoom,
        sendDraw,
        sendErase,
        clearBoard,
        sendUndo,
        sendRedo,
        sendMessage,
    } = useSocket();

    // ── Tool state ─────────────────────────────────────────────
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#1a1a2e');
    const [size, setSize] = useState(4);

    // ── Canvas + drawing hook ───────────────────────────────────
    const canvasRef = useRef(null);
    const {
        startDraw, moveDraw, endDraw,
        undoLocal, redoLocal,
        clearCanvas,
        applyRemoteStroke, applyRemoteErase,
        replayStrokes,
    } = useDrawing({ canvasRef, tool, color, size });

    // ── Undo / redo counters ────────────────────────────────────
    const [historyLen, setHistoryLen] = useState(1);
    const [redoLen, setRedoLen] = useState(0);

    // ── Presence & chat ─────────────────────────────────────────
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [roomError, setRoomError] = useState('');
    const [isHost, setIsHost] = useState(false); // true when user is the room creator

    // ── Auto REST-join on mount (idempotent) ────────────────────
    // The server requires room.hasParticipant(userId) before allowing the
    // socket join_room. Calling the REST /join endpoint here ensures the
    // host/member is in the participants list whether they navigated from
    // the dashboard or opened the URL directly.
    const [roomLoading, setRoomLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        const ensureJoined = async () => {
            try {
                await roomService.join(roomId);
            } catch (err) {
                // 4xx means room not found / closed — surface the error
                if (!cancelled) {
                    setRoomError(
                        err.response?.data?.message || 'Room not found or closed'
                    );
                }
            } finally {
                if (!cancelled) setRoomLoading(false);
            }
        };
        ensureJoined();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    // ── Mobile UI state ────────────────────────────────
    const [chatOpen, setChatOpen] = useState(true); // on mobile, toggled by button

    // ── Screen share ────────────────────────────────
    const {
        isSharing, startShare, stopShare,
        remoteStream, sharerName,
    } = useScreenShare({ socket, isHost });

    // ── File share ────────────────────────────────
    // drawImageOnCanvas: loads a URL into an Image and draws it centred
    const drawImageOnCanvas = useCallback((url) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Scale to fit inside canvas while preserving aspect ratio
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height,
                1  // never upscale beyond natural size
            );
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            dirtyRef.current = true;
        };
        img.onerror = () => console.error('Failed to load image:', url);
        img.src = url;
    }, [canvasRef]); // eslint-disable-line react-hooks/exhaustive-deps

    const { files, uploading, uploadError, uploadFile } =
        useFileShare({ socket, roomId, token });

    // ── Save modal + dirty flag ─────────────────────────────────
    const [showSaveModal, setShowSaveModal] = useState(false);
    // dirtyRef: true once any stroke is drawn or restored
    const dirtyRef = useRef(false);

    // ── Browser-level beforeunload (tab close / refresh) ───────
    useEffect(() => {
        const handler = (e) => {
            if (!dirtyRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // ── Join / leave room via socket ───────────────────────────
    // Only emit join_room after the REST join has completed (roomLoading=false)
    // so the server's hasParticipant() check will pass.
    useEffect(() => {
        if (!roomId || !isConnected || roomLoading || roomError) return;
        joinRoom(roomId);
        return () => { leaveRoom(roomId); };
    }, [roomId, isConnected, roomLoading, roomError, joinRoom, leaveRoom]);

    // ── Socket event listeners ─────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Room
        const onJoined = ({ onlineCount, role }) => {
            console.log(`✅ Joined room ${roomId}  role:${role}  ${onlineCount} online`);
            setIsHost(role === 'host');
        };
        const onPresenceSnapshot = (users) => setOnlineUsers(users);
        const onUserJoined = ({ onlineUsers: list }) => setOnlineUsers(list);
        const onUserLeft = ({ onlineUsers: list }) => setOnlineUsers(list);
        const onChatHistory = (history) => setMessages(history);
        const onRoomError = ({ message }) => {
            setRoomError(message);
            setTimeout(() => navigate(ROUTES.DASHBOARD), 3000);
        };

        // Canvas restore: replay persisted strokes when joining
        const onCanvasRestore = (strokes) => {
            if (strokes?.length) {
                replayStrokes(strokes);
                setHistoryLen(n => n + strokes.length);
                dirtyRef.current = true;
            }
        };

        // Board
        const onDraw = (stroke) => {
            applyRemoteStroke(stroke);
            setHistoryLen(n => n + 1);
            setRedoLen(0);
            dirtyRef.current = true;
        };
        const onErase = (stroke) => {
            applyRemoteErase(stroke);
            setHistoryLen(n => n + 1);
            setRedoLen(0);
            dirtyRef.current = true;
        };
        const onUndo = () => { undoLocal(); setHistoryLen(n => Math.max(1, n - 1)); setRedoLen(n => n + 1); };
        const onRedo = () => { redoLocal(); setHistoryLen(n => n + 1); setRedoLen(n => Math.max(0, n - 1)); };
        const onClearBoard = () => { clearCanvas(); setHistoryLen(1); setRedoLen(0); dirtyRef.current = false; };

        // Chat
        const onChatMessage = (msg) => setMessages(prev => [...prev, msg]);

        socket.on('room:joined', onJoined);
        socket.on('presence:snapshot', onPresenceSnapshot);
        socket.on('user_joined', onUserJoined);
        socket.on('user_left', onUserLeft);
        socket.on('chat:history', onChatHistory);
        socket.on('room:error', onRoomError);
        socket.on('canvas:restore', onCanvasRestore);
        socket.on('draw', onDraw);
        socket.on('erase', onErase);
        socket.on('undo', onUndo);
        socket.on('redo', onRedo);
        socket.on('clear_board', onClearBoard);
        socket.on('chat_message', onChatMessage);

        return () => {
            socket.off('room:joined', onJoined);
            socket.off('presence:snapshot', onPresenceSnapshot);
            socket.off('user_joined', onUserJoined);
            socket.off('user_left', onUserLeft);
            socket.off('chat:history', onChatHistory);
            socket.off('room:error', onRoomError);
            socket.off('canvas:restore', onCanvasRestore);
            socket.off('draw', onDraw);
            socket.off('erase', onErase);
            socket.off('undo', onUndo);
            socket.off('redo', onRedo);
            socket.off('clear_board', onClearBoard);
            socket.off('chat_message', onChatMessage);
        };
    }, [socket, applyRemoteStroke, applyRemoteErase, undoLocal, redoLocal,
        clearCanvas, navigate, roomId, replayStrokes]);

    // ── Keyboard shortcuts ─────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    // ── Canvas mouse handlers ──────────────────────────────────
    const handleMouseDown = useCallback((e) => startDraw(e), [startDraw]);
    const handleMouseMove = useCallback((e) => moveDraw(e), [moveDraw]);
    const handleMouseUp = useCallback((e) => {
        const stroke = endDraw(e);
        if (!stroke) return;
        setHistoryLen(n => n + 1);
        setRedoLen(0);
        dirtyRef.current = true;
        if (stroke.tool === 'eraser') sendErase(stroke);
        else sendDraw(stroke);
    }, [endDraw, sendDraw, sendErase]);

    const handleMouseLeave = useCallback((e) => {
        const stroke = endDraw(e);
        if (!stroke) return;
        setHistoryLen(n => n + 1);
        setRedoLen(0);
        dirtyRef.current = true;
        if (stroke.tool === 'eraser') sendErase(stroke);
        else sendDraw(stroke);
    }, [endDraw, sendDraw, sendErase]);

    // ── Undo ───────────────────────────────────────────────────
    const handleUndo = useCallback(() => {
        if (historyLen <= 1) return;
        undoLocal();
        setHistoryLen(n => Math.max(1, n - 1));
        setRedoLen(n => n + 1);
        sendUndo();
    }, [historyLen, undoLocal, sendUndo]);

    // ── Redo ───────────────────────────────────────────────────
    const handleRedo = useCallback(() => {
        if (redoLen === 0) return;
        redoLocal();
        setHistoryLen(n => n + 1);
        setRedoLen(n => Math.max(0, n - 1));
        sendRedo();
    }, [redoLen, redoLocal, sendRedo]);

    // ── Clear ──────────────────────────────────────────────────
    const handleClear = useCallback(() => {
        if (!window.confirm('Clear the board for everyone? This cannot be undone.')) return;
        clearCanvas();
        setHistoryLen(1);
        setRedoLen(0);
        dirtyRef.current = false;
        clearBoard();
    }, [clearCanvas, clearBoard]);

    // ── Save as PNG ────────────────────────────────────────────
    const downloadPng = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `whiteboard-${roomId}-${Date.now()}.png`;
        link.click();
    }, [canvasRef, roomId]);

    // ── SaveModal handlers ─────────────────────────────────────
    const handleModalDownload = useCallback(() => {
        downloadPng();
        setShowSaveModal(false);
        dirtyRef.current = false;
        navigate(ROUTES.DASHBOARD);
    }, [downloadPng, navigate]);

    const handleModalLeave = useCallback(() => {
        setShowSaveModal(false);
        dirtyRef.current = false;
        navigate(ROUTES.DASHBOARD);
    }, [navigate]);

    const handleModalStay = useCallback(() => {
        setShowSaveModal(false);
    }, []);

    // ── Chat ───────────────────────────────────────────────────
    const handleSendMessage = useCallback((text) => {
        sendMessage(roomId, text);
    }, [sendMessage, roomId]);

    // ── Loading / connecting guard ──────────────────────────────
    if (roomLoading || !socket) {
        return (
            <div className="room-loading-screen">
                <span className="spinner spinner--lg" />
                <p>{roomLoading ? 'Joining room…' : 'Connecting…'}</p>
            </div>
        );
    }

    // ── Error screen ───────────────────────────────────────────
    if (roomError) {
        return (
            <div className="room-error-overlay">
                <p>⚠️ {roomError}</p>
                <p className="room-error-overlay__hint">Redirecting to dashboard…</p>
            </div>
        );
    }


    return (
        <div className="wb-room">
            {/* ── Screen share overlay (host badge / participant video) ── */}
            <ScreenShareOverlay
                isSharing={isSharing}
                remoteStream={remoteStream}
                sharerName={sharerName}
                onStopShare={stopShare}
            />

            {/* ── Save modal (navigation guard) ── */}
            <SaveModal
                isOpen={showSaveModal}
                onDownload={handleModalDownload}
                onLeave={handleModalLeave}
                onStay={handleModalStay}
            />

            {/* ── Status bar ── */}
            <header className="wb-room__bar">
                <span className="wb-room__title">
                    🖊️ Room: <strong>{roomId}</strong>
                </span>
                <span className={`wb-room__status ${isConnected ? 'wb-room__status--live' : 'wb-room__status--off'}`}>
                    {isConnected ? '● Live' : '○ Disconnected'}
                </span>

                {/* Download PNG */}
                <button
                    className="btn btn--ghost btn--sm wb-room__download-btn"
                    onClick={downloadPng}
                    title="Download canvas as PNG"
                >
                    ⬇ PNG
                </button>

                {/* Screen share (host only) */}
                {isHost && (
                    <button
                        className={`btn btn--sm ${isSharing ? 'btn--danger' : 'btn--ghost'
                            }`}
                        onClick={isSharing ? stopShare : startShare}
                        title={isSharing ? 'Stop sharing your screen' : 'Share your screen with participants'}
                    >
                        {isSharing ? '⏹ Stop Sharing' : '📺 Share Screen'}
                    </button>
                )}

                {/* Mobile chat toggle */}
                <button
                    className="btn btn--ghost btn--sm wb-room__mobile-btn wb-room__chat-toggle"
                    onClick={() => setChatOpen(o => !o)}
                    title={chatOpen ? 'Hide chat' : 'Show chat'}
                    aria-label="Toggle chat"
                >
                    💬
                </button>

                <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                        if (dirtyRef.current) {
                            setShowSaveModal(true);
                        } else {
                            navigate(ROUTES.DASHBOARD);
                        }
                    }}
                >
                    ← Dashboard
                </button>
            </header>

            {/* ── 3-column workspace ── */}
            <div className="wb-room__workspace">
                <Toolbar
                    tool={tool} color={color} size={size}
                    onToolChange={setTool}
                    onColorChange={setColor}
                    onSizeChange={setSize}
                    onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear}
                    canUndo={historyLen > 1}
                    canRedo={redoLen > 0}
                    isHost={isHost}
                />

                <main className="wb-canvas-area">
                    <canvas
                        ref={canvasRef}
                        className="wb-canvas"
                        width={CANVAS_W}
                        height={CANVAS_H}
                        style={{ cursor: tool === 'eraser' ? ERASER_CURSOR : PEN_CURSOR }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                    />
                </main>

                <ChatPanel
                    messages={messages}
                    onlineUsers={onlineUsers}
                    currentUserId={user?._id}
                    onSendMessage={handleSendMessage}
                    roomId={roomId}
                    isOpen={chatOpen}
                    onClose={() => setChatOpen(false)}
                />

                <FileSharePanel
                    files={files}
                    uploading={uploading}
                    uploadError={uploadError}
                    onUpload={uploadFile}
                    onDrawImage={drawImageOnCanvas}
                />
            </div>
        </div>
    );
}
