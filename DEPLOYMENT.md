# NEXUS ARENA — Production Deployment Guide 🚀

NEXUS ARENA is built as an npm monorepo with distinct packages under `apps/` and `packages/`:
- **`apps/server`**: Node.js Express & Socket.IO Real-Time Backend (`PORT 4000` default).
- **`apps/web`**: React + Vite + Tailwind CSS Frontend UI (`PORT 5173` default).
- **`packages/shared`**: Shared TypeScript types, Zod schemas, & socket event definitions.

---

## Option A: All-in-One Single Server Deployment (Render / Railway / VPS / DigitalOcean)

You can host both the frontend static build and the backend Node.js Socket.IO server on a single server (or PaaS container like Railway or Render).

### 1. Build Command
```bash
npm run build
```
This automatically compiles:
1. `@nexus-arena/shared` (TypeScript definitions)
2. `@nexus-arena/server` (`dist/index.js` Express + Socket.IO server)
3. `@nexus-arena/web` (`dist/` static web app)

### 2. Environment Variables

#### Backend (`apps/server/.env`)
```env
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
JWT_SECRET=your-secure-random-jwt-secret-key
DATABASE_URL="file:./dev.db" # Or PostgreSQL: postgresql://user:pass@host:5432/nexus_arena
```

#### Frontend (`apps/web/.env`)
```env
VITE_SERVER_URL=https://your-backend-domain.com
```

### 3. Database Sync (Prisma)
Before starting the backend in production:
```bash
npm run build --workspace=@nexus-arena/shared
npx prisma db push --schema=apps/server/prisma/schema.prisma
```

### 4. Start Server Command
```bash
node apps/server/dist/index.js
```

---

## Option B: Separated Cloud Deployment (Vercel + Railway / Render)

### 1. Frontend (`apps/web`) on Vercel or Netlify
- **Root Directory**: `apps/web` (or root with workspace build command)
- **Build Command**: `npm run build --workspace=@nexus-arena/web`
- **Output Directory**: `apps/web/dist`
- **Environment Variable**: `VITE_SERVER_URL=https://your-backend.up.railway.app`

### 2. Backend (`apps/server`) on Railway, Render, or Fly.io
- **Root Directory**: `.` (Monorepo root)
- **Build Command**: `npm run build`
- **Start Command**: `node apps/server/dist/index.js`
- **Environment Variables**:
  - `CLIENT_URL=https://your-app.vercel.app`
  - `JWT_SECRET=super-secret-key`
  - `DATABASE_URL=file:./dev.db` (or Neon PostgreSQL connection string)

---

## Option C: Docker Deployment

Create a container or run with `docker-compose`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY apps/server/package*.json apps/server/
COPY apps/web/package*.json apps/web/
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["node", "apps/server/dist/index.js"]
```

---

## Default Production Credentials

- **Admin Route**: `#admin`
- **Default Admin Account**: `admin@nexus.com`
- **Default Admin Password**: `AdminPassword123!`
