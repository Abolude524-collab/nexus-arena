# NEXUS ARENA — Real-Time Multiplayer Web Platform

**NEXUS ARENA** is a production-grade, open-source real-time multiplayer browser gaming platform. Built with TypeScript, React, Tailwind CSS, Canvas API, Express, Socket.IO, and Prisma ORM.

---

## 🌟 Key Features

- **Server-Authoritative Game Engine**: Position, velocity, collisions, collectible spawning, timers, and match results are 100% calculated and validated on the server. Clients submit sequence-tracked movement inputs.
- **60 FPS Canvas Rendering**: High-performance game rendering loop (`requestAnimationFrame`) rendered independently from React state cycles.
- **Real-Time Synchronization**: Instant state snapshot broadcasting across all connected browser sessions.
- **Persistent Leaderboards & User Stats**: Match results, player scores, win counts, and XP progression automatically persist to PostgreSQL / SQLite database via Prisma transactions.
- **Room Management**: Custom room creation, unique room code join system (`JOIN BY CODE`), host transfer, password protection, and player capacity rules.
- **Integrated Room Chat**: Real-time room text communication with rate limiting, Zod validation, and system notifications.
- **Reconnection Grace Period**: 20-second disconnect grace period preserves player sessions across socket dropouts and page refreshes.

---

## 🏗️ Architecture Stack

```text
nexus-arena/
├── apps/
│   ├── web/        # Vite, React 18, Tailwind CSS, Zustand, Socket.IO Client, Canvas API
│   └── server/     # Express, Socket.IO Server, Prisma ORM, JWT, bcryptjs, Vitest
├── packages/
│   └── shared/     # Strict TypeScript contracts, socket events, Zod validation schemas
```

---

## 🚀 Local Quickstart Setup

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Shared Package
```bash
npm run build --workspace=packages/shared
```

### 3. Initialize Database
```bash
cd apps/server
npx prisma db push
cd ../..
```

### 4. Run Development Servers
In separate terminal windows:

**Backend Server (Port 4000)**:
```bash
npm run dev:server
```

**Web Client (Port 5173)**:
```bash
npm run dev:web
```

---

## 🧪 Verification & Testing

```bash
# Typecheck strict TypeScript across monorepo
npm run typecheck

# Run Vitest unit tests
npm run test

# Build production bundles
npm run build
```

---

## 📝 Environment Variables

Copy `.env.example` to `apps/server/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="nexus-arena-super-secret-jwt-key-2026"
CLIENT_URL="http://localhost:5173"
```

---

## 📄 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Multi-layer technical architecture breakdown.
- [CONTRIBUTING.md](CONTRIBUTING.md) — Open source contribution guidelines.
- [SECURITY.md](SECURITY.md) — Security policy and vulnerability disclosures.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community code of conduct.
- [LICENSE](LICENSE) — MIT License.
