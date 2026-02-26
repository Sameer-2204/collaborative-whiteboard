/* ──────────────────────────────────────────────────────────────
   src/pages/DashboardPage.jsx
   Protected dashboard: create room, join room, recent sessions.
   ────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext';
import roomService from '../services/roomService';
import { ROUTES } from '../utils/constants';

/* ── Tiny helpers ─────────────────────────────────────────────── */
const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

/* ── RoomCard ─────────────────────────────────────────────────── */
function RoomCard({ room, currentUserId, onClose, onNavigate }) {
    const isHost = room.host?._id === currentUserId || room.host === currentUserId;

    return (
        <div className="room-card">
            <div className="room-card__top">
                <span className="room-card__code">{room.roomId}</span>
                {isHost && <span className="room-card__badge badge--host">Host</span>}
                {!isHost && <span className="room-card__badge badge--member">Member</span>}
            </div>

            <p className="room-card__name">{room.name || 'Unnamed Session'}</p>

            <div className="room-card__meta">
                <span>👥 {room.participantCount ?? room.participants?.length ?? 0} / {room.maxParticipants}</span>
                <span>{timeAgo(room.updatedAt)}</span>
            </div>

            <div className="room-card__actions">
                <button
                    className="btn btn--primary btn--sm"
                    onClick={() => onNavigate(room.roomId)}
                >
                    Open →
                </button>
                {isHost && (
                    <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => onClose(room.roomId)}
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── DashboardPage ────────────────────────────────────────────── */
function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ── state ──────────────────────────────────────────────────
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [roomsError, setRoomsError] = useState('');

    // Create room
    const [roomName, setRoomName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Join room
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState('');

    // ── fetch rooms ────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        setLoadingRooms(true);
        setRoomsError('');
        try {
            const res = await roomService.getMyRooms();
            setRooms(res.data.rooms);
        } catch (err) {
            setRoomsError(err.response?.data?.message || 'Failed to load rooms');
        } finally {
            setLoadingRooms(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    // ── create room ────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const res = await roomService.create({ name: roomName.trim() });
            const newRoom = res.data.room;
            navigate(ROUTES.ROOM(newRoom.roomId));
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Could not create room');
        } finally {
            setCreating(false);
        }
    };

    // ── join room ──────────────────────────────────────────────
    const handleJoin = async (e) => {
        e.preventDefault();
        const code = joinCode.trim().toUpperCase();
        if (!code) { setJoinError('Enter a room code'); return; }
        setJoinError('');
        setJoining(true);
        try {
            await roomService.join(code);
            navigate(ROUTES.ROOM(code));
        } catch (err) {
            setJoinError(err.response?.data?.message || 'Room not found');
        } finally {
            setJoining(false);
        }
    };

    // ── close room (host) ──────────────────────────────────────
    const handleClose = async (roomId) => {
        if (!window.confirm(`Close room ${roomId}?`)) return;
        try {
            await roomService.close(roomId);
            setRooms(prev => prev.filter(r => r.roomId !== roomId));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close room');
        }
    };

    const navigateToRoom = (roomId) => navigate(ROUTES.ROOM(roomId));

    // ── render ─────────────────────────────────────────────────
    return (
        <>
            <Navbar />
            <main className="page page--dashboard">

                {/* ── Welcome ── */}
                <header className="dash-header">
                    <div>
                        <h1 className="dash-header__title">
                            Welcome back, {user?.name ?? 'there'} 👋
                        </h1>
                        <p className="dash-header__sub">Manage your whiteboard sessions</p>
                    </div>
                </header>

                {/* ── Actions row ── */}
                <div className="dash-actions">

                    {/* Create room card */}
                    <div className="action-card">
                        <h2 className="action-card__title">✏️  New Session</h2>
                        <p className="action-card__desc">
                            Start a new whiteboard room and share the code with others.
                        </p>
                        <form onSubmit={handleCreate} className="action-form">
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Session name (optional)"
                                value={roomName}
                                onChange={e => setRoomName(e.target.value)}
                                maxLength={80}
                                disabled={creating}
                            />
                            {createError && <span className="form-error">{createError}</span>}
                            <button
                                className="btn btn--primary btn--block"
                                type="submit"
                                disabled={creating}
                            >
                                {creating ? <span className="spinner" /> : '+ Create Room'}
                            </button>
                        </form>
                    </div>

                    {/* Join room card */}
                    <div className="action-card">
                        <h2 className="action-card__title">🔗  Join Session</h2>
                        <p className="action-card__desc">
                            Have a 6-character room code? Enter it below to jump in.
                        </p>
                        <form onSubmit={handleJoin} className="action-form">
                            <input
                                className={`form-input form-input--code${joinError ? ' form-input--error' : ''}`}
                                type="text"
                                placeholder="e.g. WB3K9X"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                maxLength={6}
                                autoComplete="off"
                                spellCheck={false}
                                disabled={joining}
                            />
                            {joinError && <span className="form-error">{joinError}</span>}
                            <button
                                className="btn btn--outline btn--block"
                                type="submit"
                                disabled={joining || joinCode.trim().length === 0}
                            >
                                {joining ? <span className="spinner spinner--dark" /> : 'Join Room →'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Recent sessions ── */}
                <section className="dash-section">
                    <div className="dash-section__header">
                        <h2 className="dash-section__title">Recent Sessions</h2>
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={fetchRooms}
                            disabled={loadingRooms}
                            title="Refresh"
                        >
                            {loadingRooms ? '⏳' : '↻ Refresh'}
                        </button>
                    </div>

                    {roomsError && (
                        <div className="alert alert--error">{roomsError}</div>
                    )}

                    {loadingRooms && (
                        <div className="rooms-loading">
                            <span className="spinner spinner--lg" /> Loading sessions…
                        </div>
                    )}

                    {!loadingRooms && rooms.length === 0 && !roomsError && (
                        <div className="rooms-empty">
                            <p className="rooms-empty__icon">🗒️</p>
                            <p>No active sessions yet.</p>
                            <p className="rooms-empty__hint">Create or join a room to get started.</p>
                        </div>
                    )}

                    {!loadingRooms && rooms.length > 0 && (
                        <div className="room-grid">
                            {rooms.map(room => (
                                <RoomCard
                                    key={room._id}
                                    room={room}
                                    currentUserId={user?._id}
                                    onClose={handleClose}
                                    onNavigate={navigateToRoom}
                                />
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </>
    );
}

export default DashboardPage;
