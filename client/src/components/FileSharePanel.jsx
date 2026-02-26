/* ──────────────────────────────────────────────────────────────
   src/components/FileSharePanel.jsx
   Collapsible side panel for sharing and viewing files in a room.

   Features:
   ─ File picker (image + PDF only, ≤ 20 MB)
   ─ Upload progress / error display
   ─ Shared files list with icons per type
   ─ "Draw on canvas" button for images
   ─ "Open" button for all file types (new tab)
   ─ Collapsible with animated toggle

   Props:
     files       – SharedFile[]
     uploading   – boolean
     uploadError – string
     onUpload    – (File) => void
     onDrawImage – (url: string) => void  ← renders image on canvas
   ────────────────────────────────────────────────────────────── */

import React, { useRef, useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────
function fileIcon(mimeType) {
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    return '📎';
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf';
const MAX_BYTES = 20 * 1024 * 1024;

// ── File row ──────────────────────────────────────────────────────
function FileRow({ file, onDrawImage }) {
    const isImage = file.mimeType?.startsWith('image/');
    return (
        <li className="fileshare-item">
            <span className="fileshare-item__icon">{fileIcon(file.mimeType)}</span>
            <div className="fileshare-item__info">
                <span className="fileshare-item__name" title={file.name}>
                    {file.name}
                </span>
                <span className="fileshare-item__meta">
                    {formatBytes(file.size)} · {file.sharedBy?.name ?? file.uploadedBy?.name ?? 'Unknown'}
                </span>
            </div>
            <div className="fileshare-item__actions">
                {isImage && (
                    <button
                        className="btn btn--ghost btn--xs"
                        onClick={() => onDrawImage(file.url)}
                        title="Draw this image on the canvas"
                    >
                        🖊️
                    </button>
                )}
                <a
                    className="btn btn--ghost btn--xs"
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in new tab"
                >
                    ↗
                </a>
            </div>
        </li>
    );
}

// ── Panel ─────────────────────────────────────────────────────────
export default function FileSharePanel({
    files = [],
    uploading = false,
    uploadError = '',
    onUpload,
    onDrawImage,
}) {
    const inputRef = useRef(null);
    const [open, setOpen] = useState(true);
    const [localErr, setLocalErr] = useState('');

    const handleFileChange = (e) => {
        setLocalErr('');
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_BYTES) {
            setLocalErr('File exceeds the 20 MB limit.');
            e.target.value = '';
            return;
        }
        onUpload(file);
        e.target.value = '';
    };

    const displayError = localErr || uploadError;

    return (
        <aside className={`fileshare-panel${open ? '' : ' fileshare-panel--collapsed'}`}>
            {/* Header */}
            <div
                className="fileshare-panel__header"
                onClick={() => setOpen(o => !o)}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                title={open ? 'Collapse file panel' : 'Expand file panel'}
            >
                <span>📎 Files {files.length > 0 && `(${files.length})`}</span>
                <span className="fileshare-panel__chevron">{open ? '▾' : '◂'}</span>
            </div>

            {open && (
                <div className="fileshare-panel__body">
                    {/* Upload area */}
                    <div className="fileshare-upload">
                        <input
                            ref={inputRef}
                            id="fileshare-input"
                            type="file"
                            accept={ACCEPT}
                            onChange={handleFileChange}
                            className="fileshare-upload__input"
                            aria-label="Choose file to share"
                        />
                        <button
                            className="btn btn--primary btn--sm fileshare-upload__btn"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? '⏳ Uploading…' : '⬆ Share File'}
                        </button>
                        <span className="fileshare-upload__hint">Image or PDF · max 20 MB</span>
                    </div>

                    {displayError && (
                        <p className="fileshare-error" role="alert">{displayError}</p>
                    )}

                    {/* File list */}
                    {files.length === 0 ? (
                        <p className="fileshare-empty">No files shared yet.</p>
                    ) : (
                        <ul className="fileshare-list">
                            {files.map(f => (
                                <FileRow
                                    key={f.fileId}
                                    file={f}
                                    onDrawImage={onDrawImage}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </aside>
    );
}
