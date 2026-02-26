/* ──────────────────────────────────────────────────────────────
   src/main.jsx
   Application entry point.

   Wraps the React tree with:
     BrowserRouter  – enables client-side routing
     All Context providers (AuthContext, SocketContext, etc.)
     are applied in App.jsx so the router has access to them
   ────────────────────────────────────────────────────────────── */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
