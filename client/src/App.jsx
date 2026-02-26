/* ──────────────────────────────────────────────────────────────
   src/App.jsx
   Root component – context providers + route declarations.

   Public:     /  /login  /register
   Protected:  /dashboard  /board/:boardId  /room/:roomId
   Catch-all:  * → 404
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import WhiteboardRoom from './pages/WhiteboardRoom.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Layout / Route Guards
import PrivateRoute from './components/PrivateRoute.jsx';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          {/* ── Public ───────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Protected (JWT required) ──────────────────────── */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/board/:boardId" element={<BoardPage />} />
            <Route path="/room/:roomId" element={<WhiteboardRoom />} />
          </Route>

          {/* ── 404 ──────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

