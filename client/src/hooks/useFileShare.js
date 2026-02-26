/* ──────────────────────────────────────────────────────────────
   src/hooks/useFileShare.js
   Manages file upload (via REST) and real-time broadcast (via socket).

   Flow:
     1. User picks a file → uploadFile(file, roomId, token)
        POST /api/rooms/:roomId/files  →  { file: { fileId, url, name, … } }
     2. On success, emit  socket.emit('file:share', metadata)
     3. Server broadcasts file:shared to room (including sender echo)
     4. onFileShared listener adds entry to `files` state list

   On mount, loads existing files via GET /api/rooms/:roomId/files.
   ────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export default function useFileShare({ socket, roomId, token }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Track file IDs we've already added to avoid duplicates (echo + broadcast)
    const seenIds = useRef(new Set());

    const addFile = useCallback((file) => {
        if (seenIds.current.has(file.fileId)) return;
        seenIds.current.add(file.fileId);
        setFiles(prev => [file, ...prev]);
    }, []);

    // ── Load existing files on mount ──────────────────────────────
    useEffect(() => {
        if (!roomId || !token) return;

        axios.get(`${SERVER_URL}/api/rooms/${roomId}/files`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(({ data }) => {
                if (data.files) {
                    data.files.forEach(f => {
                        seenIds.current.add(f.fileId);
                    });
                    setFiles(data.files);
                }
            })
            .catch(err => console.error('Failed to load shared files:', err));
    }, [roomId, token]);

    // ── Socket listener: file:shared ──────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onFileShared = (file) => addFile(file);
        socket.on('file:shared', onFileShared);
        return () => socket.off('file:shared', onFileShared);
    }, [socket, addFile]);

    // ── Upload a file ─────────────────────────────────────────────
    const uploadFile = useCallback(async (file) => {
        if (!file || !roomId || !token) return;

        setUploading(true);
        setUploadError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await axios.post(
                `${SERVER_URL}/api/rooms/${roomId}/files`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            // Emit to room via socket (server will echo back to us too)
            if (socket && data.file) {
                socket.emit('file:share', data.file);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Upload failed. Please try again.';
            setUploadError(msg);
        } finally {
            setUploading(false);
        }
    }, [roomId, token, socket]);

    return { files, uploading, uploadError, uploadFile };
}
