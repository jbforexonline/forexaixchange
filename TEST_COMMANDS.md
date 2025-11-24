# Test Commands for ForexAiXchange

## Quick Test Commands

### Port Configuration
- **Frontend**: `http://localhost:3000` (fixed port)
- **Backend**: `http://localhost:4000`
- **PostgreSQL**: `localhost:5433`
- **Redis**: `localhost:6379`

### 1. Test Backend Build
```bash
cd backend
pnpm run build
```

### 2. Test Frontend Build
```bash
cd frontend
pnpm run build
```

### 3. Run Backend Development Server
```bash
cd backend
pnpm run dev
```
Backend will run on: `http://localhost:4000`

### 4. Run Frontend Development Server
```bash
cd frontend
pnpm run dev
```
Frontend will run on: `http://localhost:3000`

### 5. Run Both (Backend + Frontend)

**Terminal 1 (Backend):**
```bash
cd backend
pnpm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
pnpm run dev
```

---

## Full Setup & Test (First Time)

### Step 1: Install All Dependencies
```bash
# From root directory
pnpm install

# Or install separately
cd backend && pnpm install
cd ../frontend && pnpm install
```

### Step 2: Setup Database (Backend)
```bash
cd backend
pnpm run db:generate
pnpm run db:migrate
```

### Step 3: Build Backend (Verify)
```bash
cd backend
pnpm run build
```

### Step 4: Build Frontend (Verify)
```bash
cd frontend
pnpm run build
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
pnpm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm run dev
```

---

## Test Endpoints

### Backend Health Check
```bash
curl http://localhost:4000/health
```

### Backend API Docs (Swagger)
Open browser: `http://localhost:4000/api`

### Frontend
Open browser: `http://localhost:3000`

---

## Quick Test Checklist

- [ ] Backend builds successfully (`pnpm run build`)
- [ ] Frontend builds successfully (`pnpm run build`)
- [ ] Backend starts without errors (`pnpm run dev`)
- [ ] Frontend starts without errors (`pnpm run dev`)
- [ ] Can access backend health endpoint
- [ ] Can access Swagger API docs
- [ ] Can access frontend in browser
- [ ] Login form loads
- [ ] Register form loads
- [ ] Spin page loads (may use mock data)

---

## Troubleshooting

### Backend Issues
```bash
# Check if Prisma is generated
cd backend
pnpm run db:generate

# Check if migrations are applied
pnpm run db:migrate

# Check backend port (should be 4000)
# Update .env if needed
```

### Frontend Issues
```bash
# Clear Next.js cache
cd frontend
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Check if backend URL is correct in frontend
# Look for NEXT_PUBLIC_BACKEND_URL in .env.local
```

### Port Conflicts

**Issue: Frontend runs on 3001 when started from root**
- **Cause**: Next.js auto-increments port if 3000 is in use
- **Solution**: Explicitly set port with `-p 3000` flag (already fixed in `package.json`)

**Ports:**
- Backend default: `4000`
- Frontend default: `3000` (now fixed)
- PostgreSQL: `5433`
- Redis: `6379`

**If port 3000 is still in use:**
```bash
# Windows PowerShell - Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or restart your terminal/IDE
```

**Change ports in:**
- Backend: `backend/src/main.ts` or `PORT` environment variable
- Frontend: `frontend/package.json` scripts (already set to `-p 3000`)

