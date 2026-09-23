# NEXUS ARENA — Production Deployment Guide 🚀

NEXUS ARENA consists of two independent, standalone applications:
- **`frontend/`**: Vite + React 18 + Tailwind CSS SPA (e.g. Vercel, Netlify, Render Static Site).
- **`backend/`**: Node.js + Express + Socket.IO + Prisma server (e.g. Render, Railway, Fly.io, VPS).

---

## 1. Backend Deployment (`backend/`)

Deploy to **Render Web Service**, **Railway**, **Fly.io**, or any Node.js container host.

### Configuration Settings
- **Root Directory**: `backend`
- **Build Command**:
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
  *(or `node dist/index.js`)*

### Environment Variables
Configure these variables in your hosting provider's dashboard:

```env
PORT=4000
NODE_ENV=production
CLIENT_URL=https://your-frontend.vercel.app
JWT_SECRET=your-secure-random-jwt-secret-key
DATABASE_URL=postgresql://user:password@ep-cool-db.neon.tech/nexus_arena?sslmode=require
```

### Database Initialization
Run Prisma migrations/push to sync your PostgreSQL schema:
```bash
npx prisma db push
```

---

## 2. Frontend Deployment (`frontend/`)

Deploy to **Vercel**, **Netlify**, or **Render Static Site**.

### Configuration Settings
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Output Directory**:
  ```text
  dist
  ```

### Environment Variables
```env
VITE_SERVER_URL=https://your-backend-api.onrender.com
```

---

## 🔑 Default Production Admin Credentials

- **Admin Login Route**: `#admin` (e.g. `https://your-frontend-app.com/#admin`)
- **Default Admin Account**: `admin@nexus.com`
- **Default Admin Password**: `AdminPassword123!`
