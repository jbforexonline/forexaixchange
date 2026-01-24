# New Machine Setup Guide - ForexAI Exchange

## Prerequisites
- Docker Desktop installed and running
- Node.js (v18+) installed
- Git installed

## Step-by-Step Setup

### 1. Clone and Navigate
```bash
git clone <your-repo-url>
cd forexaixchange
```

### 2. Install pnpm
```powershell
# Enable corepack (comes with Node.js)
corepack enable
corepack prepare pnpm@9.0.0 --activate

# Verify installation
pnpm --version
```

### 3. Environment Setup
```powershell
# Copy environment files if they don't exist
if (!(Test-Path "backend\.env")) { Copy-Item "backend\.env.example" "backend\.env" }
if (!(Test-Path "frontend\.env.local")) { Copy-Item "frontend\.env.local.example" "frontend\.env.local" }
```

### 4. Docker Services
```powershell
# Start PostgreSQL and Redis
docker-compose -f backend/infra/docker-compose.yml up -d

# Verify services are running
docker ps
```

### 5. Install Dependencies
```powershell
# Install all workspace dependencies
pnpm install
```

### 6. Database Setup
```powershell
# Run migrations
pnpm --filter backend db:migrate

# Generate Prisma client
pnpm --filter backend db:generate

# Optional: Seed database
pnpm --filter backend db:seed
```

### 7. Build Projects
```powershell
# Build all packages
pnpm build
```

### 8. Start Development
```powershell
# Start all development servers
pnpm dev
```

## Services Running
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379

## Automated Setup
Run the automated setup script:
```powershell
.\setup-pnpm.ps1
```

## Troubleshooting

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Docker Issues
- Ensure Docker Desktop is running
- Check port conflicts (5433, 6379, 3000, 4000)
- Restart Docker if containers fail to start

### Database Issues
```powershell
# Reset database if needed
pnpm --filter backend db:reset

# Check PostgreSQL connection
docker exec fx-postgres pg_isready -U fx
```

### Port Conflicts
If ports are in use, you can change them in:
- `backend/infra/docker-compose.yml` (PostgreSQL, Redis)
- `backend/.env` (DATABASE_URL, REDIS_URL)
- `frontend/.env.local` (NEXT_PUBLIC_BACKEND_URL)