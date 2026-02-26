/* ──────────────────────────────────────────────────────────────
   src/hooks/useScreenShare.js
   Manages WebRTC peer connections for screen sharing.

   HOST role:
     startShare()  → getDisplayMedia → emits screen:start
                  → on screen:request, creates RTCPeerConnection per
                    participant, adds tracks, creates/sends offer
     stopShare()   → stops tracks, closes all PCs, emits screen:stop

   PARTICIPANT role:
     on screen:available → emits screen:request to host
     on screen:offer     → creates RTCPeerConnection, creates answer
     on track event      → setRemoteStream → rendered by ScreenShareOverlay

   ICE candidates are relayed in both directions via screen:ice.

   STUN: Google's public servers (no TURN needed for LAN/local dev).
   For production behind symmetric NAT, add TURN servers to RTC_CONFIG.
   ────────────────────────────────────────────────────────────── */

import { useState, useRef, useEffect, useCallback } from 'react';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export default function useScreenShare({ socket, isHost }) {
    // ── Shared state ──────────────────────────────────────────────
    const [isSharing, setIsSharing] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);  // participant view
    const [sharerName, setSharerName] = useState('');
    const [sharerSocketId, setSharerSocketId] = useState(null);

    // ── Refs (mutable, not re-render triggers) ───────────────────
    // Host keeps one RTCPeerConnection per participant socket ID
    const peerConnsRef = useRef(new Map());
    // Participant keeps one inbound RTCPeerConnection
    const myPcRef = useRef(null);
    const localStreamRef = useRef(null);  // host's MediaStream

    // ── Helpers ───────────────────────────────────────────────────
    /** Creates a fresh RTCPeerConnection and wires ICE relay for HOST side */
    const _makeHostPc = useCallback((participantSocketId) => {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnsRef.current.set(participantSocketId, pc);

        pc.onicecandidate = ({ candidate }) => {
            if (candidate && socket) {
                socket.emit('screen:ice', { to: participantSocketId, candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
                pc.close();
                peerConnsRef.current.delete(participantSocketId);
            }
        };

        // Add all display stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track =>
                pc.addTrack(track, localStreamRef.current)
            );
        }

        return pc;
    }, [socket]);

    /** Closes and cleans up the participant's inbound PC */
    const _closeMyPc = useCallback(() => {
        if (myPcRef.current) {
            myPcRef.current.close();
            myPcRef.current = null;
        }
        setRemoteStream(null);
        setSharerName('');
        setSharerSocketId(null);
    }, []);

    // ── HOST: start screen share ──────────────────────────────────
    const startShare = useCallback(async () => {
        if (!socket || isSharing) return;

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: { ideal: 30, max: 30 } },
                audio: true,
            });

            localStreamRef.current = stream;
            setIsSharing(true);

            // Notify all room participants
            socket.emit('screen:start');

            // Browser's built-in "Stop sharing" button
            stream.getVideoTracks()[0].addEventListener('ended', stopShare, { once: true });

        } catch (err) {
            // User cancelled the picker or permission denied
            if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                console.error('getDisplayMedia error:', err);
            }
        }
    }, [socket, isSharing]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── HOST: stop screen share ───────────────────────────────────
    const stopShare = useCallback(() => {
        // Stop all media tracks
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        // Close all peer connections
        peerConnsRef.current.forEach(pc => pc.close());
        peerConnsRef.current.clear();

        if (socket) socket.emit('screen:stop');
        setIsSharing(false);
    }, [socket]);

    // ── Socket event handlers ─────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // ── PARTICIPANT: host announced they are sharing ──────────
        const onScreenAvailable = ({ hostSocketId, host }) => {
            setSharerName(host.name);
            setSharerSocketId(hostSocketId);
            // Request the host to create an offer for us
            socket.emit('screen:request', { hostSocketId });
        };

        // ── HOST: participant is requesting a stream ──────────────
        const onScreenRequest = async ({ from }) => {
            // Only the host should handle these
            if (!localStreamRef.current) return;

            const pc = _makeHostPc(from);

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('screen:offer', { to: from, sdp: offer });
            } catch (err) {
                console.error('screen:offer creation error:', err);
                pc.close();
                peerConnsRef.current.delete(from);
            }
        };

        // ── PARTICIPANT: received offer from host ─────────────────
        const onScreenOffer = async ({ from, sdp }) => {
            // Close any existing connection first
            _closeMyPc();

            const pc = new RTCPeerConnection(RTC_CONFIG);
            myPcRef.current = pc;

            // When we receive media tracks, expose the stream
            pc.ontrack = (e) => {
                if (e.streams[0]) setRemoteStream(e.streams[0]);
            };

            pc.onicecandidate = ({ candidate }) => {
                if (candidate && socket) {
                    socket.emit('screen:ice', { to: from, candidate });
                }
            };

            pc.onconnectionstatechange = () => {
                if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
                    _closeMyPc();
                }
            };

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('screen:answer', { to: from, sdp: answer });
            } catch (err) {
                console.error('screen:answer creation error:', err);
                _closeMyPc();
            }
        };

        // ── HOST: received answer from participant ────────────────
        const onScreenAnswer = async ({ from, sdp }) => {
            const pc = peerConnsRef.current.get(from);
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (err) {
                console.error('screen:answer setRemoteDescription error:', err);
            }
        };

        // ── BOTH: relay ICE candidates ────────────────────────────
        const onScreenIce = async ({ from, candidate }) => {
            if (!candidate) return;
            // Could be host receiving participant's ICE, or vice versa
            const pc = peerConnsRef.current.get(from) ?? myPcRef.current;
            if (!pc) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                // Non-fatal: trickle ICE occasionally races
                console.warn('addIceCandidate error:', err.message);
            }
        };

        // ── PARTICIPANT: host stopped sharing ─────────────────────
        const onScreenStopped = () => {
            _closeMyPc();
        };

        socket.on('screen:available', onScreenAvailable);
        socket.on('screen:request', onScreenRequest);
        socket.on('screen:offer', onScreenOffer);
        socket.on('screen:answer', onScreenAnswer);
        socket.on('screen:ice', onScreenIce);
        socket.on('screen:stopped', onScreenStopped);

        return () => {
            socket.off('screen:available', onScreenAvailable);
            socket.off('screen:request', onScreenRequest);
            socket.off('screen:offer', onScreenOffer);
            socket.off('screen:answer', onScreenAnswer);
            socket.off('screen:ice', onScreenIce);
            socket.off('screen:stopped', onScreenStopped);
        };
    }, [socket, _makeHostPc, _closeMyPc]);

    // ── Cleanup on unmount ────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Host: stop all tracks + close all PCs
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peerConnsRef.current.forEach(pc => pc.close());
            peerConnsRef.current.clear();
            // Participant: close inbound PC
            if (myPcRef.current) myPcRef.current.close();
        };
    }, []);

    return {
        isSharing,
        startShare,
        stopShare,
        remoteStream,
        sharerName,
        sharerSocketId,
    };
}
