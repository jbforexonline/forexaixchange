# New Environment Setup Guide

## ✅ What You Already Have
- ✅ **Node.js** v22.20.0 (installed and working!)
- ✅ **npm** v10.9.3 (installed and working!)
- ✅ **pnpm** v9.15.9 (just installed!)
- ✅ **Docker** (version 29.1.3 installed, but Docker Desktop needs to be started)
- ✅ Environment files (`backend/.env` and `frontend/.env.local` exist)

## ⚠️ What You Need to Do

### 1. **Start Docker Desktop** (REQUIRED)
Docker is installed but the daemon is not running. You need to:

1. **Open Docker Desktop** from your Start menu
2. Wait for it to fully start (you'll see "Docker Desktop is running" in the system tray)
3. Verify it's running:
   ```powershell
   docker ps
   ```

Once Docker Desktop is running, you can proceed with the setup steps below.

### 3. **Environment Files** (REQUIRED)
You need to create environment configuration files.

#### Backend Environment File
Create `backend/.env`:
```env
PORT=4000
NODE_ENV=development

# Database (matches docker-compose.yml)
DATABASE_URL=postgresql://fx:fxpass@localhost:5433/forexaixchange?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

#### Frontend Environment File
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 4. **Git** (Optional, if you need to clone/pull)
If you need to pull updates:
- Download: https://git-scm.com/
- Or use winget: `winget install Git.Git`

---

## 🚀 Complete Setup Steps

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** from Start menu
2. Wait until it shows "Running" status
3. Verify: `docker ps` should work without errors

### Step 2: Navigate to Project
```powershell
cd D:\forexaixchange
```

### Step 3: Install Dependencies
```powershell
pnpm install
```

### Step 4: Start Docker Services (PostgreSQL + Redis)
```powershell
pnpm db:up
```

This will start:
- PostgreSQL on port 5433
- Redis on port 6379

**Verify containers are running:**
```powershell
docker ps
```

You should see `fx-postgres` and `fx-redis` containers.

### Step 5: Run Database Migrations
```powershell
pnpm --filter backend db:migrate
```

### Step 6: Generate Prisma Client
```powershell
pnpm --filter backend db:generate
```

### Step 7: Start Development Servers
```powershell
pnpm dev
```

This will start:
- **Backend** on http://localhost:4000
- **Frontend** on http://localhost:3000

---

## 🔍 Verification Checklist

After setup, verify everything works:

1. ✅ **Node.js installed**: `node -v` → v22.20.0 ✓
2. ✅ **pnpm installed**: `pnpm -v` → 9.15.9 ✓
3. ⚠️ **Docker running**: `docker ps` (start Docker Desktop first)
4. ✅ **Environment files**: `backend/.env` and `frontend/.env.local` exist ✓
5. ⏳ **Dependencies installed**: Run `pnpm install` (next step)
6. ⏳ **Database migrated**: Run `pnpm --filter backend db:migrate` (after Docker is running)
7. ⏳ **Backend running**: http://localhost:4000/health (after starting dev server)
8. ⏳ **Frontend running**: http://localhost:3000 (after starting dev server)

---

## 🐛 Troubleshooting

### Node.js not found after installation
- **Restart your terminal/PowerShell**
- Check if Node.js is in PATH: `$env:PATH`
- Try reinstalling Node.js

### pnpm installation fails
- Try with admin rights: Right-click PowerShell → "Run as Administrator"
- Or use user-level install: `npm install -g pnpm@9` (no admin needed)

### Docker containers not starting
- Make sure Docker Desktop is running
- Check Docker Desktop status in system tray
- Try: `docker-compose -f backend/infra/docker-compose.yml up -d`

### Port conflicts (5433, 4000, 3000)
- Check what's using the port: `netstat -ano | findstr :5433`
- Kill the process or change ports in docker-compose.yml and .env files

### Database connection errors
- Verify DATABASE_URL in `backend/.env` matches docker-compose.yml port (5433)
- Ensure containers are running: `docker ps`
- Try restarting containers: `pnpm db:down` then `pnpm db:up`

---

## 📝 Quick Reference Commands

```powershell
# Start databases
pnpm db:up

# Stop databases
pnpm db:down

# Run migrations
pnpm --filter backend db:migrate

# Start dev servers (backend + frontend)
pnpm dev

# Backend only
pnpm --filter backend dev

# Frontend only
pnpm --filter frontend dev

# Check backend health
curl http://localhost:4000/health
```

---

## 🎯 Next Steps After Setup

1. Open http://localhost:3000 in your browser
2. Check backend health: http://localhost:4000/health
3. View API docs: http://localhost:4000/api/docs (Swagger)
4. Start coding! 🚀






```# Database (default dev stack runs on localhost:5433 via infra/docker-compose.yml)
DATABASE_URL="postgresql://fx:fxpass@localhost:5433/forexaixchange"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Server
PORT=4000
NODE_ENV="development"

# Redis (only required if you enable caching modules)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# CORS / Frontend origin
FRONTEND_URL="http://localhost:3000"

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback


#OTP
EMAIL_PROVIDER=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreplyforexaixchange@gmail.com      # whatever this Gmail is
EMAIL_PASSWORD=xsgsadudilknwpzk       # from the app password popup (no spaces)




NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
