# 🖊️ Collaborative Whiteboard

A real-time collaborative whiteboard application built with **React**, **Node.js**, **Socket.io**, and **MongoDB**. Multiple users can draw together, chat, share files, and share screens — all live in the same room.

---

## ✨ Feature List

| Category | Feature |
|---|---|
| **Drawing** | Pen and eraser tools, colour palette + custom colour picker, adjustable brush size (1–40px), undo/redo |
| **Collaboration** | Real-time multi-user drawing, live presence list, chat with per-user message bubbles |
| **Persistence** | All strokes saved to MongoDB and replayed on join; 7-day TTL auto-expiry |
| **File Sharing** | Upload image or PDF (≤ 20 MB), broadcast to all room members, render images directly onto the canvas |
| **Screen Sharing** | WebRTC peer-to-peer screen share (host → participants) via Socket.io signaling relay |
| **Role-Based Access** | Host-only board clear (enforced on both server and client) |
| **Canvas Export** | Download the current canvas as a PNG |
| **Save Guard** | Navigation intercepted when canvas has unsaved changes — download, leave, or stay |
| **Responsive Design** | Desktop 3-column layout; tablet sliding chat panel; mobile bottom toolbar + bottom sheet chat |
| **Auth** | JWT-based register/login with bcrypt password hashing and 7-day token expiry |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)             │
│                                                          │
│  pages/         WhiteboardRoom  Dashboard  Auth          │
│  components/    Toolbar  ChatPanel  FileSharePanel       │
│                 SaveModal  ScreenShareOverlay            │
│  hooks/         useDrawing  useScreenShare  useFileShare  │
│  context/       AuthContext  SocketContext               │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP REST + WebSocket (Socket.io)
┌────────────────────────▼────────────────────────────────┐
│                   SERVER (Node.js + Express)             │
│                                                          │
│  REST API                  Socket.io /whiteboard ns      │
│  ─────────────             ──────────────────────────   │
│  /api/auth                 roomHandlers  (join/leave)    │
│  /api/rooms                boardHandlers (draw/erase)    │
│  /api/rooms/:id/files      screenHandlers (WebRTC relay) │
│  /api/users                fileHandlers  (file:share)    │
│  /api/boards                                             │
│  /uploads   (static)                                     │
└────────────────────────┬────────────────────────────────┘
                         │  Mongoose ODM
┌────────────────────────▼────────────────────────────────┐
│                    MongoDB Atlas / Local                  │
│  Collections: User · Room · Stroke · Message             │
│               Board · SharedFile                         │
└─────────────────────────────────────────────────────────┘
```

### Key design decisions
- **Socket.io for signaling only** — WebRTC media streams flow peer-to-peer (no media through the server)
- **Stroke-based persistence** — each draw/erase event is a Mongoose document; `canvas:restore` replays them on join
- **Multer disk storage** — uploaded files land in `server/uploads/` and are served as static assets at `/uploads/*`
- **Role enforcement is dual-layer** — backend checks `socket.data.role` before processing `clear_board`; frontend disables the button

---

## 📦 Project Structure

```
whiteboard/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Toolbar, ChatPanel, FileSharePanel, …
│   │   ├── context/         # AuthContext, SocketContext
│   │   ├── hooks/           # useDrawing, useScreenShare, useFileShare
│   │   ├── pages/           # WhiteboardRoom, Dashboard, Auth pages
│   │   ├── services/        # authService (Axios wrappers)
│   │   └── utils/           # constants, helpers
│   ├── .env.example         # Client env template
│   └── vite.config.js       # Production build + dev proxy config
│
├── server/                  # Node.js + Express + Socket.io backend
│   ├── config/              # corsOptions, db connection
│   ├── controllers/         # auth, room, board controllers
│   ├── middleware/          # authMiddleware, errorHandler, rateLimiter
│   ├── models/              # User, Room, Stroke, Message, Board, SharedFile
│   ├── routes/              # authRoutes, roomRoutes, fileRoutes, …
│   ├── sockets/             # index (auth middleware), roomHandlers,
│   │                        # boardHandlers, screenHandlers, fileHandlers
│   ├── uploads/             # Multer disk storage (git-ignored)
│   ├── .env.example         # Server env template
│   └── server.js            # Entry point
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Min version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| MongoDB | 6.x (local) or Atlas account |

### 1 · Clone and install

```bash
git clone https://github.com/your-org/whiteboard.git
cd whiteboard

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2 · Configure environment variables

**Server:**
```bash
cd server
cp .env.example .env
# Edit .env and fill in MONGO_URI and JWT_SECRET at minimum
```

**Client:**
```bash
cd client
cp .env.example .env
# Edit VITE_SERVER_URL if your server runs on a different port/host
```

### 3 · Start development servers

```bash
# Terminal 1 — backend (nodemon auto-reloads)
cd server && npm run dev

# Terminal 2 — frontend (Vite HMR)
cd client && npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔧 Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development` \| `production` \| `test` |
| `PORT` | Yes | `5000` | Express HTTP server port |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars in production) |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (`7d`, `24h`, `1h`, etc.) |
| `CLIENT_URL` | Yes | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per IP per window |

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Client (`client/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_SERVER_URL` | Yes | `http://localhost:5000` | Backend base URL |
| `VITE_APP_NAME` | No | `Collaborative Whiteboard` | App display name |

---

## 🌐 Deployment

### Option A — Render.com (recommended for hobby projects)

**Backend (Web Service):**
1. Connect your GitHub repo → select the `server/` subdirectory
2. Build command: `npm install`
3. Start command: `npm start`
4. Add all env vars from `server/.env.example` in the Environment section
5. Set `NODE_ENV=production`

**Frontend (Static Site):**
1. Connect repo → select `client/` subdirectory
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Add `VITE_SERVER_URL=https://your-backend.onrender.com`

---

### Option B — Railway

```bash
# Backend
railway up --service=whiteboard-server ./server

# Frontend — deploy dist/ via Vercel or Netlify
cd client && npm run build
vercel deploy --prod dist/
```

---

### Option C — VPS (Ubuntu / Nginx)

**1. Build the client:**
```bash
cd client
VITE_SERVER_URL=https://api.yourdomain.com npm run build
```

**2. Serve `dist/` with Nginx:**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    root /var/www/whiteboard/client/dist;
    index index.html;

    # SPA fallthrough — all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Node.js
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy Socket.io (WebSocket upgrade support)
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/whiteboard/server/uploads/;
    }
}
```

**3. Run the server with PM2:**
```bash
cd server
npm install -g pm2
NODE_ENV=production pm2 start server.js --name whiteboard-api
pm2 save && pm2 startup
```

**CORS setup for production:**
```env
# server/.env
CLIENT_URL=https://yourdomain.com,https://www.yourdomain.com
```

---

### Docker (optional)

```bash
# Build and run both services
docker compose up --build
```

> A `docker-compose.yml` is not included by default — add one for your own deployment pipeline.

---

## 🔒 Security Checklist for Production

- [ ] `JWT_SECRET` is a cryptographically random string ≥ 64 hex chars
- [ ] `NODE_ENV=production` is set (enables strict CORS, disables verbose error messages)
- [ ] `CLIENT_URL` lists only your actual frontend domain(s)
- [ ] MongoDB Atlas IP allowlist restricts access to your server IPs only
- [ ] HTTPS is enforced (Let's Encrypt / Render / Vercel handle this automatically)
- [ ] `server/uploads/` is either mounted as a persistent volume or migrated to S3/R2

---

## 🛠️ Available Scripts

### Server

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot-reload) |
| `npm start` | Start for production |
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint check |

### Client

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (HMR, port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally (port 4173) |
| `npm run lint` | ESLint check |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push and open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE).
