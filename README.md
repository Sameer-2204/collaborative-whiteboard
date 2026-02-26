# 🖊️ Collaborative Whiteboard

A real-time collaborative whiteboard application built with **React**, **Node.js**, **Socket.io**, and **MongoDB**. Multiple users can draw together, chat, share files, and share screens — all live in the same room.

🔗 **Live Demo:** [whiteboard-eight-phi.vercel.app](https://whiteboard-eight-phi.vercel.app)  
🛠️ **API:** [collaborative-whiteboard-l758.onrender.com](https://collaborative-whiteboard-l758.onrender.com/health)  
📦 **Repo:** [github.com/Sameer-2204/collaborative-whiteboard](https://github.com/Sameer-2204/collaborative-whiteboard)

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
│                      MongoDB Atlas                        │
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
│   ├── middleware/           # authMiddleware, errorHandler, rateLimiter
│   ├── models/              # User, Room, Stroke, Message, Board, SharedFile
│   ├── routes/              # authRoutes, roomRoutes, fileRoutes, …
│   ├── sockets/             # index (auth middleware), roomHandlers,
│   │                        # boardHandlers, screenHandlers, fileHandlers
│   ├── uploads/             # Multer disk storage (git-ignored)
│   ├── .env.example         # Server env template
│   └── server.js            # Entry point
│
├── render.yaml              # Render.com deployment blueprint
├── vercel.json              # Vercel deployment config
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
git clone https://github.com/Sameer-2204/collaborative-whiteboard.git
cd collaborative-whiteboard

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
# Edit .env — fill in MONGO_URI and JWT_SECRET at minimum
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

This project is deployed using:

| Layer | Service | URL |
|---|---|---|
| Frontend | Vercel | [whiteboard-eight-phi.vercel.app](https://whiteboard-eight-phi.vercel.app) |
| Backend | Render.com | [collaborative-whiteboard-l758.onrender.com](https://collaborative-whiteboard-l758.onrender.com) |
| Database | MongoDB Atlas | M0 free cluster |

### Deploy your own

**Backend → Render.com**
1. Connect your GitHub repo at [render.com](https://render.com) → **New Web Service**
2. Set **Root Directory** to `server` — Render will detect `render.yaml`
3. Add env vars in the dashboard: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`
4. Click **Create Web Service**

**Frontend → Vercel**
```bash
cd client
npm install -g vercel
vercel --prod
```
Set `VITE_SERVER_URL=https://your-backend.onrender.com` in Vercel → Settings → Environment Variables, then redeploy with `vercel --prod --force`.

> **Note:** Render's free tier spins down after 15 min of inactivity (first request after sleep takes ~30 s). Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 14 minutes to keep it warm.

---

## 🔒 Security Checklist for Production

- [ ] `JWT_SECRET` is a cryptographically random string ≥ 64 hex chars
- [ ] `NODE_ENV=production` is set (enables strict CORS, disables verbose error messages)
- [ ] `CLIENT_URL` lists only your actual frontend domain(s)
- [ ] MongoDB Atlas IP allowlist restricts access to your server IPs only
- [ ] HTTPS is enforced (Render / Vercel handle this automatically)
- [ ] `server/uploads/` is either mounted as a persistent volume or migrated to S3/Cloudinary

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
