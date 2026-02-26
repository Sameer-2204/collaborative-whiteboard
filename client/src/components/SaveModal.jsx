/* ──────────────────────────────────────────────────────────────
   src/components/SaveModal.jsx
   Confirmation dialog shown before the user leaves a room.

   Props:
     isOpen      – controls visibility
     onDownload  – callback: download canvas as PNG then leave
     onLeave     – callback: leave without downloading
     onStay      – callback: cancel, stay in room

   Design: full-screen overlay with a centred card.
   ────────────────────────────────────────────────────────────── */

import React from 'react';

export default function SaveModal({ isOpen, onDownload, onLeave, onStay }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true"
            aria-labelledby="save-modal-title">
            {/* Click backdrop to stay */}
            <div className="modal-backdrop" onClick={onStay} />

            <div className="modal-card">
                <h2 className="modal-card__title" id="save-modal-title">
                    💾 Save before leaving?
                </h2>
                <p className="modal-card__body">
                    Your drawing exists in this session. Would you like to
                    download a copy as a PNG image before you leave?
                </p>

                <div className="modal-card__actions">
                    <button
                        className="btn btn--primary"
                        onClick={onDownload}
                        title="Download drawing as PNG then leave the room"
                    >
                        ⬇ Download & Leave
                    </button>
                    <button
                        className="btn btn--outline"
                        onClick={onLeave}
                        title="Leave without downloading"
                    >
                        Leave without saving
                    </button>
                    <button
                        className="btn btn--ghost"
                        onClick={onStay}
                        title="Stay in the room"
                    >
                        ✕ Stay
                    </button>
                </div>
            </div>
        </div>
    );
}
