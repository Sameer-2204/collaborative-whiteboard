/* ──────────────────────────────────────────────────────────────
   src/components/ScreenShareOverlay.jsx
   Floating overlay shown during an active screen share session.

   HOST view (isSharing):
     - "📺 You are sharing" badge
     - Stop Sharing button

   PARTICIPANT view (remoteStream):
     - Floating video player (resizable, bottom-right)
     - Sharer's name label
     - Minimize / close button to hide the overlay

   Props:
     isSharing    – boolean: current user is the host/sharer
     remoteStream – MediaStream: incoming stream (participant only)
     sharerName   – string: name of the person sharing
     onStopShare  – callback: invoked when host clicks Stop Sharing
   ────────────────────────────────────────────────────────────── */

import React, { useRef, useEffect, useState } from 'react';

/* ── Host view ─────────────────────────────────────────────────── */
function HostShareBadge({ onStop }) {
    return (
        <div className="screenshare-overlay screenshare-overlay--host" role="status">
            <div className="screenshare-badge">
                <span className="screenshare-badge__dot" aria-hidden="true" />
                <span>📺 You are sharing your screen</span>
            </div>
            <button
                className="btn btn--sm screenshare-stop-btn"
                onClick={onStop}
                title="Stop sharing your screen"
            >
                ⏹ Stop Sharing
            </button>
        </div>
    );
}

/* ── Participant view ──────────────────────────────────────────── */
function ParticipantView({ stream, sharerName, onClose }) {
    const videoRef = useRef(null);
    const [minimized, setMinimized] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    if (minimized) {
        return (
            <div
                className="screenshare-overlay screenshare-overlay--minimized"
                onClick={() => setMinimized(false)}
                role="button"
                tabIndex={0}
                title="Click to expand screen share"
            >
                📺 {sharerName}'s screen
            </div>
        );
    }

    return (
        <div className="screenshare-overlay screenshare-overlay--participant">
            <div className="screenshare-header">
                <span className="screenshare-title">
                    <span className="screenshare-badge__dot" aria-hidden="true" />
                    📺 {sharerName}'s screen
                </span>
                <div className="screenshare-header__actions">
                    <button
                        className="screenshare-icon-btn"
                        onClick={() => setMinimized(true)}
                        title="Minimise"
                        aria-label="Minimise screen share"
                    >
                        —
                    </button>
                    <button
                        className="screenshare-icon-btn screenshare-icon-btn--close"
                        onClick={onClose}
                        title="Close stream"
                        aria-label="Close screen share"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <video
                ref={videoRef}
                className="screenshare-video"
                autoPlay
                playsInline
                muted={false}
            />
        </div>
    );
}

/* ── Exported component ────────────────────────────────────────── */
export default function ScreenShareOverlay({
    isSharing,
    remoteStream,
    sharerName,
    onStopShare,
}) {
    if (isSharing) {
        return <HostShareBadge onStop={onStopShare} />;
    }

    if (remoteStream) {
        // Give participants a way to locally dismiss the overlay without
        // affecting the share itself (stream keeps coming, just hidden)
        return (
            <ParticipantView
                stream={remoteStream}
                sharerName={sharerName || 'Someone'}
                onClose={() => {/* handled by local minimise */ }}
            />
        );
    }

    return null;
}
