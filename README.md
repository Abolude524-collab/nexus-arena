# NEXUS ARENA — Real-Time Multiplayer Web Platform

**NEXUS ARENA** is a production-grade, open-source real-time multiplayer browser gaming platform built with TypeScript, React 18, Vite, Tailwind CSS, Canvas API, Express, Socket.IO, and Prisma ORM.

---

## 🌟 Key Features

- **Server-Authoritative Game Engine**: Position, velocity, collisions, collectible spawning, timers, and match results are 100% calculated and validated on the server. Clients submit sequence-tracked movement inputs.
- **60 FPS Canvas Rendering**: High-performance game rendering loop (`requestAnimationFrame`) rendered independently from React state cycles.
- **Real-Time Synchronization**: Instant state snapshot broadcasting across all connected browser sessions.
- **Persistent Leaderboards & User Stats**: Match results, player scores, win counts, and XP progression automatically persist to PostgreSQL database via Prisma transactions.
- **Room Management**: Custom room creation, unique room code join system (`JOIN BY CODE`), host transfer, password protection, and player capacity rules.
- **Integrated Room Chat**: Real-time room text communication with rate limiting, Zod validation, and system notifications.
- **Reconnection Grace Period**: 20-second disconnect grace period preserves player sessions across socket dropouts and page refreshes.

---

## 🏗️ Independent Application Architecture

```text
nexus-arena/
├── frontend/             # Standalone React + Vite + Tailwind CSS + Socket.IO Client App
│   ├── src/
│   │   ├── components/
│   │   ├── game/
│   │   ├── services/
│   │   ├── shared/       # Standalone shared types & Zod schemas
│   │   ├── store/
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/              # Standalone Node.js + Express + Socket.IO + Prisma App
│   ├── src/
│   │   ├── db/
│   │   ├── game/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── shared/       # Standalone shared types & Zod schemas
│   │   └── sockets/
│   ├── prisma/
│   │   └── schema.prisma # PostgreSQL datasource schema
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── README.md
└── .gitignore
```

---

## 🚀 Local Quickstart Setup

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### 1. Backend Setup (`/backend`)
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run dev
```
Runs on `http://localhost:4000`.

### 2. Frontend Setup (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

---

## 🧪 Independent Testing & Building

### Frontend (`/frontend`)
```bash
cd frontend
npm run typecheck   # Typecheck TypeScript
npm test            # Run Vitest unit tests
npm run build       # Produce production bundle in dist/
```

### Backend (`/backend`)
```bash
cd backend
npm run typecheck   # Typecheck TypeScript
npm test            # Run Vitest unit tests
npm run build       # Compile TypeScript output to dist/
npm start           # Execute dist/index.js
```

---

## 📄 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Production cloud deployment instructions.
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture breakdown.
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines.
- [SECURITY.md](SECURITY.md) — Security policy.
- [LICENSE](LICENSE) — MIT License.
