# Setup and Run Script for ForexAI Exchange (Using pnpm)
# Run this script from the project root: D:\forexaixchange

Write-Host "=== ForexAI Exchange Setup (pnpm version) ===" -ForegroundColor Cyan

# Check if pnpm is available
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "Using pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "pnpm not found. Please install pnpm first:" -ForegroundColor Red
    Write-Host "  Option 1: corepack enable && corepack prepare pnpm@9.0.0 --activate" -ForegroundColor Yellow
    Write-Host "  Option 2: iwr https://get.pnpm.io/install.ps1 -useb | iex" -ForegroundColor Yellow
    exit 1
}

# Step 0: Setup Environment Files
Write-Host "`n[0/7] Setting up environment files..." -ForegroundColor Yellow

if (!(Test-Path "backend\.env")) {
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "✓ Created backend/.env from example" -ForegroundColor Green
    } else {
        Write-Host "⚠ backend/.env.example not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ backend/.env already exists" -ForegroundColor Green
}

if (!(Test-Path "frontend\.env.local")) {
    if (Test-Path "frontend\.env.local.example") {
        Copy-Item "frontend\.env.local.example" "frontend\.env.local"
        Write-Host "✓ Created frontend/.env.local from example" -ForegroundColor Green
    } else {
        Write-Host "⚠ frontend/.env.local.example not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ frontend/.env.local already exists" -ForegroundColor Green
}

# Step 1: Install workspace dependencies
Write-Host "`n[1/7] Installing workspace dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing workspace dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Workspace dependencies installed" -ForegroundColor Green

# Step 2: Start Docker Services
Write-Host "`n[2/7] Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow

# Check if Docker is available
try {
    docker --version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "Docker not found. Please install Docker Desktop and ensure it's running." -ForegroundColor Red
    exit 1
}

docker-compose -f backend/infra/docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting Docker services. Make sure Docker Desktop is running." -ForegroundColor Red
    Write-Host "Try: docker-compose -f backend/infra/docker-compose.yml down && docker-compose -f backend/infra/docker-compose.yml up -d" -ForegroundColor Yellow
    exit 1
}
Start-Sleep -Seconds 5
Write-Host "✓ Docker services started" -ForegroundColor Green

# Step 3: Wait for PostgreSQL to be ready
Write-Host "`n[3/7] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    Start-Sleep -Seconds 2
    $result = docker exec fx-postgres pg_isready -U fx 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL is ready" -ForegroundColor Green
        break
    }
    Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "✗ PostgreSQL failed to start in time" -ForegroundColor Red
    exit 1
}

# Step 4: Run Database Migrations (from backend workspace)
Write-Host "`n[4/7] Running database migrations..." -ForegroundColor Yellow
pnpm --filter backend db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running migrations" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migrations completed" -ForegroundColor Green

# Step 5: Generate Prisma Client (from backend workspace)
Write-Host "`n[5/7] Generating Prisma client..." -ForegroundColor Yellow
pnpm --filter backend db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generating Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma client generated" -ForegroundColor Green

# Step 6: Build all packages
Write-Host "`n[6/7] Building all packages..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building packages" -ForegroundColor Red
    exit 1
}
Write-Host "✓ All packages built" -ForegroundColor Green

# Step 7: Start Development Servers
Write-Host "`n[7/7] 🚀 Starting development servers..." -ForegroundColor Yellow
Write-Host "  Backend will run on: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Frontend will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the servers`n" -ForegroundColor Yellow

# Use pnpm's parallel dev script from root package.json
Write-Host "Starting all development servers in parallel..." -ForegroundColor Yellow
pnpm dev