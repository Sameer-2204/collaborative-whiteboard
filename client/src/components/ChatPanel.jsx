/* ──────────────────────────────────────────────────────────────
   src/components/ChatPanel.jsx
   Right-side panel: online users list + live chat.

   Responsive:
    - Desktop (≥960px): always visible right column
    - Mobile (<960px):   bottom sheet, toggled by isOpen prop
   ────────────────────────────────────────────────────────────── */

import React, { useState, useRef, useEffect } from 'react';

export default function ChatPanel({
    messages,       // [{ user: { id, name }, text, sentAt }]
    onlineUsers,    // [{ id, name }]
    currentUserId,
    onSendMessage,
    roomId,
    isOpen = true,   // mobile: controlled externally
    onClose = null,   // mobile: callback to hide
}) {
    const [tab, setTab] = useState('chat'); // 'chat' | 'users'
    const [draft, setDraft] = useState('');
    const bottomRef = useRef(null);

    // Auto-scroll chat to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        onSendMessage(text);
        setDraft('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    const fmtTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <aside
            className={`chat-panel${isOpen ? ' chat-panel--open' : ' chat-panel--hidden'}`}
            aria-hidden={!isOpen}
        >
            {/* ── Mobile close + Tab bar ── */}
            <div className="chat-panel__tabs">
                <button
                    className={`chat-panel__tab${tab === 'chat' ? ' chat-panel__tab--active' : ''}`}
                    onClick={() => setTab('chat')}
                >
                    💬 Chat
                </button>
                <button
                    className={`chat-panel__tab${tab === 'users' ? ' chat-panel__tab--active' : ''}`}
                    onClick={() => setTab('users')}
                >
                    👥 Users ({onlineUsers.length})
                </button>
                {/* Close button visible only on mobile */}
                {onClose && (
                    <button
                        className="chat-panel__close"
                        onClick={onClose}
                        aria-label="Close chat"
                        title="Close"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ── Chat tab ── */}
            {tab === 'chat' && (
                <>
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <p className="chat-messages__empty">No messages yet. Say hi! 👋</p>
                        )}
                        {messages.map((msg, i) => {
                            const isMe = msg.user?.id === currentUserId;
                            return (
                                <div
                                    key={i}
                                    className={`chat-msg${isMe ? ' chat-msg--me' : ''}`}
                                >
                                    {!isMe && (
                                        <span className="chat-msg__name">{msg.user?.name}</span>
                                    )}
                                    <div className="chat-msg__bubble">
                                        {msg.text}
                                    </div>
                                    <span className="chat-msg__time">{fmtTime(msg.sentAt)}</span>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <form className="chat-input" onSubmit={handleSend}>
                        <input
                            className="chat-input__field"
                            type="text"
                            placeholder="Send a message…"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKey}
                            maxLength={500}
                        />
                        <button
                            className="chat-input__btn"
                            type="submit"
                            disabled={!draft.trim()}
                            title="Send"
                        >
                            ➤
                        </button>
                    </form>
                </>
            )}

            {/* ── Users tab ── */}
            {tab === 'users' && (
                <div className="user-list">
                    {onlineUsers.length === 0 && (
                        <p className="chat-messages__empty">No one online yet.</p>
                    )}
                    {onlineUsers.map((u) => (
                        <div key={u.id} className="user-list__item">
                            <span className="user-list__dot" />
                            <span className="user-list__name">
                                {u.name}
                                {u.id === currentUserId && (
                                    <span className="user-list__you"> (you)</span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </aside>
    );
}
