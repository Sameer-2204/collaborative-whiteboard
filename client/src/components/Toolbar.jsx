/* ──────────────────────────────────────────────────────────────
   src/components/Toolbar.jsx
   Drawing toolbar — two layout modes:

   Desktop (isMobile=false, default):
     Left-side vertical column with labels

   Mobile (isMobile=true, via CSS media query):
     Fixed bottom navigation strip (horizontal icon buttons).
     The JSX is identical; CSS media queries flip the layout.
     A mobile-only "More" button opens a slide-up sheet with
     colour picker, brush size, and clear board.
   ────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';

const TOOLS = [
    { id: 'pen', emoji: '✏️', label: 'Pen' },
    { id: 'eraser', emoji: '🩹', label: 'Eraser' },
];

const PALETTE = [
    '#1a1a2e', '#e94560', '#f5a623', '#f8e71c',
    '#7ed321', '#4a90e2', '#9013fe', '#ffffff',
];

const SIZES = [2, 4, 8, 16];

export default function Toolbar({
    tool,
    color,
    size,
    onToolChange,
    onColorChange,
    onSizeChange,
    onUndo,
    onRedo,
    onClear,
    canUndo,
    canRedo,
    isHost,          // true only for the room creator
}) {
    const [moreOpen, setMoreOpen] = useState(false);

    return (
        <>
            {/* ── Main toolbar (vertical desktop / horizontal strip mobile) ── */}
            <aside className="toolbar">
                {/* ── Tools ── */}
                <section className="toolbar__section">
                    <p className="toolbar__label">Tool</p>
                    {TOOLS.map(({ id, emoji, label }) => (
                        <button
                            key={id}
                            className={`toolbar__btn${tool === id ? ' toolbar__btn--active' : ''}`}
                            onClick={() => onToolChange(id)}
                            title={label}
                        >
                            {emoji}
                            <span className="toolbar__btn-text">{label}</span>
                        </button>
                    ))}
                </section>

                <div className="toolbar__divider" />

                {/* ── Colour palette (hidden on mobile, shown in More sheet) ── */}
                <section className="toolbar__section toolbar__section--desktop">
                    <p className="toolbar__label">Colour</p>
                    <div className="toolbar__palette">
                        {PALETTE.map((c) => (
                            <button
                                key={c}
                                className={`toolbar__swatch${color === c ? ' toolbar__swatch--active' : ''}`}
                                style={{ background: c }}
                                onClick={() => onColorChange(c)}
                                title={c}
                            />
                        ))}
                    </div>
                    {/* Custom colour picker */}
                    <label className="toolbar__custom-color" title="Custom colour">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onColorChange(e.target.value)}
                        />
                        <span className="toolbar__swatch toolbar__swatch--custom"
                            style={{ background: color }}>+</span>
                    </label>
                </section>

                <div className="toolbar__divider toolbar__divider--desktop" />

                {/* ── Brush size (hidden on mobile) ── */}
                <section className="toolbar__section toolbar__section--desktop">
                    <p className="toolbar__label">Size — {size}px</p>
                    <input
                        className="toolbar__slider"
                        type="range"
                        min={1}
                        max={40}
                        value={size}
                        onChange={(e) => onSizeChange(Number(e.target.value))}
                    />
                    <div className="toolbar__size-dots">
                        {SIZES.map((s) => (
                            <button
                                key={s}
                                className={`toolbar__dot${size === s ? ' toolbar__dot--active' : ''}`}
                                style={{ width: s + 8, height: s + 8 }}
                                onClick={() => onSizeChange(s)}
                                title={`${s}px`}
                            />
                        ))}
                    </div>
                </section>

                <div className="toolbar__divider" />

                {/* ── History ── */}
                <section className="toolbar__section">
                    <p className="toolbar__label">History</p>
                    <button
                        className="toolbar__btn"
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo (Ctrl+Z)"
                    >
                        ↩ <span className="toolbar__btn-text">Undo</span>
                    </button>
                    <button
                        className="toolbar__btn"
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo (Ctrl+Y)"
                    >
                        ↪ <span className="toolbar__btn-text">Redo</span>
                    </button>
                </section>

                <div className="toolbar__divider" />

                {/* ── Clear (host-only) ── */}
                <section className="toolbar__section">
                    <button
                        className={`toolbar__btn toolbar__btn--danger${!isHost ? ' toolbar__btn--locked' : ''}`}
                        onClick={onClear}
                        disabled={!isHost}
                        title={isHost ? 'Clear board for everyone' : '🔒 Only the host can clear the board'}
                        aria-label={isHost ? 'Clear board' : 'Clear board (host only)'}
                    >
                        {isHost ? '🗑️' : '🔒'}
                        <span className="toolbar__btn-text">
                            {isHost ? 'Clear' : 'Host only'}
                        </span>
                    </button>
                </section>

                {/* ── Mobile-only: "More" button (colour + size) ── */}
                <section className="toolbar__section toolbar__section--mobile">
                    <button
                        className="toolbar__btn"
                        onClick={() => setMoreOpen(o => !o)}
                        title="More options"
                        aria-expanded={moreOpen}
                    >
                        ⚙️
                        <span className="toolbar__btn-text">More</span>
                    </button>
                </section>
            </aside>

            {/* ── Mobile "More" bottom sheet ── */}
            {moreOpen && (
                <div
                    className="toolbar-more-backdrop"
                    onClick={() => setMoreOpen(false)}
                    aria-hidden="true"
                />
            )}
            <div className={`toolbar-more${moreOpen ? ' toolbar-more--open' : ''}`}>
                <div className="toolbar-more__header">
                    <span>Brush Settings</span>
                    <button
                        className="toolbar-more__close"
                        onClick={() => setMoreOpen(false)}
                        aria-label="Close"
                    >✕</button>
                </div>

                <div className="toolbar-more__body">
                    <p className="toolbar__label">Colour</p>
                    <div className="toolbar__palette toolbar__palette--wide">
                        {PALETTE.map((c) => (
                            <button
                                key={c}
                                className={`toolbar__swatch${color === c ? ' toolbar__swatch--active' : ''}`}
                                style={{ background: c }}
                                onClick={() => { onColorChange(c); setMoreOpen(false); }}
                                title={c}
                            />
                        ))}
                    </div>
                    <label className="toolbar__custom-color toolbar__custom-color--row" title="Custom colour">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => onColorChange(e.target.value)}
                        />
                        <span className="toolbar__swatch toolbar__swatch--custom"
                            style={{ background: color }}>+</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>Custom</span>
                    </label>

                    <div className="toolbar__divider" style={{ margin: '8px 0' }} />

                    <p className="toolbar__label">Brush size — {size}px</p>
                    <input
                        className="toolbar__slider toolbar__slider--wide"
                        type="range"
                        min={1}
                        max={40}
                        value={size}
                        onChange={(e) => onSizeChange(Number(e.target.value))}
                    />
                </div>
            </div>
        </>
    );
}
