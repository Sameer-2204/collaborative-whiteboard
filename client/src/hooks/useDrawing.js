/* ──────────────────────────────────────────────────────────────
   src/hooks/useDrawing.js
   Custom hook encapsulating ALL canvas drawing logic.

   Responsibilities:
   - Mouse/touch event handlers (startDraw, moveDraw, endDraw)
   - Smooth freehand rendering via quadratic Bézier curves
   - Local undo / redo via ImageData snapshot stack
   - Eraser via destination-out composite operation
   - Produces stroke objects ready to emit to Socket.io
   - applyRemoteStroke / applyRemoteErase to replay peer strokes
   - clearCanvas with snapshot save

   Stroke object schema:
   {
     id     : string     (uuid)
     type   : 'stroke'
     tool   : 'pen' | 'eraser'
     color  : string
     size   : number
     points : [{x, y}]
   }
   ────────────────────────────────────────────────────────────── */

import { useRef, useState, useCallback, useEffect } from 'react';

const MAX_HISTORY = 50; // max ImageData snapshots kept in memory

// Simple UUID-lite (no crypto dependency needed in browser)
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * getCanvasPoint
 * Converts a mouse/touch event to coordinates relative to the canvas element.
 */
const getCanvasPoint = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
        x: (src.clientX - rect.left) * scaleX,
        y: (src.clientY - rect.top) * scaleY,
    };
};

/**
 * drawSmooth
 * Renders a stroke array onto the given 2D context using
 * quadratic Bézier curves for smooth lines.
 */
const drawSmooth = (ctx, points, color, size, tool) => {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
        // Single dot
        ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
        ctx.fill();
    } else {
        for (let i = 1; i < points.length - 1; i++) {
            const mx = (points[i].x + points[i + 1].x) / 2;
            const my = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        // Last segment
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
    }

    ctx.restore();
};

export default function useDrawing({ canvasRef, tool, color, size }) {
    // ── Local state ────────────────────────────────────────────
    const isDrawing = useRef(false);
    const currentStroke = useRef([]);     // points for the in-progress stroke
    const strokeId = useRef(null);    // id for the in-progress stroke

    // History stacks store serialised ImageData blobs
    const historyStack = useRef([]);      // undo stack
    const redoStack = useRef([]);      // redo stack

    // ── Save / restore helpers ─────────────────────────────────
    const saveSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyStack.current.push(snapshot);
        if (historyStack.current.length > MAX_HISTORY) {
            historyStack.current.shift();
        }
        redoStack.current = []; // any new stroke clears redo
    }, [canvasRef]);

    const restoreSnapshot = useCallback((snapshot) => {
        const canvas = canvasRef.current;
        if (!canvas || !snapshot) return;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(snapshot, 0, 0);
    }, [canvasRef]);

    // ── Fill canvas white on first mount ───────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Save blank state as first undo point
        saveSnapshot();
    }, [canvasRef, saveSnapshot]);

    // ── Mouse / Touch handlers ─────────────────────────────────
    const startDraw = useCallback((e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const point = getCanvasPoint(e, canvas);
        isDrawing.current = true;
        strokeId.current = uid();
        currentStroke.current = [point];

        // Begin the path segment visually
        const ctx = canvas.getContext('2d');
        drawSmooth(ctx, [point], color, size, tool);
    }, [canvasRef, color, size, tool]);

    const moveDraw = useCallback((e) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const point = getCanvasPoint(e, canvas);
        currentStroke.current.push(point);

        // Redraw only the last segment for performance
        const ctx = canvas.getContext('2d');
        const pts = currentStroke.current;
        const last = pts.length - 1;
        // Draw from penultimate → latest using quadratic
        if (pts.length >= 3) {
            const mid = {
                x: (pts[last - 1].x + pts[last].x) / 2,
                y: (pts[last - 1].y + pts[last].y) / 2,
            };
            drawSmooth(ctx, [pts[last - 2], pts[last - 1], mid], color, size, tool);
        } else {
            drawSmooth(ctx, pts, color, size, tool);
        }
    }, [canvasRef, color, size, tool]);

    /**
     * endDraw
     * Finalises the stroke, saves a snapshot, and returns the
     * stroke object ready to emit via Socket.io.
     * Returns null if nothing was drawn.
     */
    const endDraw = useCallback((e) => {
        e?.preventDefault();
        if (!isDrawing.current) return null;
        isDrawing.current = false;

        const pts = currentStroke.current;
        if (pts.length === 0) return null;

        saveSnapshot();

        const stroke = {
            id: strokeId.current,
            type: 'stroke',
            tool,
            color,
            size,
            points: [...pts],
        };

        currentStroke.current = [];
        strokeId.current = null;
        return stroke;
    }, [tool, color, size, saveSnapshot]);

    // ── Undo ──────────────────────────────────────────────────
    const undoLocal = useCallback(() => {
        if (historyStack.current.length <= 1) return; // keep blank state
        const current = historyStack.current.pop();
        redoStack.current.push(current);
        restoreSnapshot(historyStack.current[historyStack.current.length - 1]);
    }, [restoreSnapshot]);

    // ── Redo ──────────────────────────────────────────────────
    const redoLocal = useCallback(() => {
        const snapshot = redoStack.current.pop();
        if (!snapshot) return;
        historyStack.current.push(snapshot);
        restoreSnapshot(snapshot);
    }, [restoreSnapshot]);

    // ── Clear canvas ──────────────────────────────────────────
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        historyStack.current = [];
        redoStack.current = [];
        saveSnapshot(); // save blank as new base
    }, [canvasRef, saveSnapshot]);

    // ── Apply remote stroke (from another user) ───────────────
    const applyRemoteStroke = useCallback((stroke) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        drawSmooth(ctx, stroke.points, stroke.color, stroke.size, stroke.tool);
        saveSnapshot();
    }, [canvasRef, saveSnapshot]);

    const applyRemoteErase = useCallback((stroke) => {
        applyRemoteStroke({ ...stroke, tool: 'eraser' });
    }, [applyRemoteStroke]);

    // ── Replay array of persisted strokes (canvas:restore) ────────
    /**
     * replayStrokes
     * Replays an array of stroke objects onto the canvas.
     * Called once on join with the full history from MongoDB.
     * Does NOT save per-stroke snapshots for performance;
     * saves one single snapshot after all strokes are drawn.
     */
    const replayStrokes = useCallback((strokes) => {
        const canvas = canvasRef.current;
        if (!canvas || !strokes?.length) return;
        const ctx = canvas.getContext('2d');

        for (const stroke of strokes) {
            drawSmooth(ctx, stroke.points, stroke.color, stroke.size, stroke.tool);
        }

        // Save a single snapshot after full replay so undo still works
        saveSnapshot();
    }, [canvasRef, saveSnapshot]);

    return {
        startDraw,
        moveDraw,
        endDraw,
        undoLocal,
        redoLocal,
        clearCanvas,
        applyRemoteStroke,
        applyRemoteErase,
        replayStrokes,
    };
}
