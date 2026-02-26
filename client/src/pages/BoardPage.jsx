/* ──────────────────────────────────────────────────────────────
   src/pages/BoardPage.jsx
   Protected page – collaborative canvas at route: /board/:boardId

   This is the core page of the application.

   TODO (Phase 2):
     - Read boardId from useParams()
     - Join Socket.io room: socket.emit('room:join', { boardId })
     - Fetch initial board state from boardService.getBoardById()
     - Render <Canvas /> (drawing surface)
     - Render <Toolbar /> (tool selector, colour picker, stroke width)
     - Render <CursorOverlay /> (other users' live cursors)
     - Render <Sidebar /> (participants list, board settings)
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import useSocket from '../hooks/useSocket';

function BoardPage() {
    const { boardId } = useParams();
    const { isConnected } = useSocket();

    return (
        <>
            <Navbar />
            <main className="page page--board">
                {/* Status bar */}
                <div className="board__statusbar">
                    <span className="board__id">Board: {boardId}</span>
                    <span className={`board__conn ${isConnected ? 'board__conn--live' : 'board__conn--off'}`}>
                        {isConnected ? '🟢 Live' : '🔴 Disconnected'}
                    </span>
                </div>

                {/* TODO Phase 2: Canvas, Toolbar, Sidebar, CursorOverlay */}
                <div className="board__canvas-placeholder">
                    <p className="placeholder-text">
                        🎨 Canvas will render here in Phase 2
                    </p>
                </div>
            </main>
        </>
    );
}

export default BoardPage;
