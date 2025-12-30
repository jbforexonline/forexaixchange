# Setup and Run Script for ForexAI Exchange
# Run this script from the project root: D:\forexaixchange

Write-Host "=== ForexAI Exchange Setup ===" -ForegroundColor Cyan

# Step 1: Start Docker Services
Write-Host "`n[1/5] Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker-compose -f backend/infra/docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting Docker services. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}
Start-Sleep -Seconds 5
Write-Host "✓ Docker services started" -ForegroundColor Green

# Step 2: Wait for PostgreSQL to be ready
Write-Host "`n[2/5] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
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

# Step 3: Run Database Migrations
Write-Host "`n[3/5] Running database migrations..." -ForegroundColor Yellow
pnpm --filter backend db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running migrations" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migrations completed" -ForegroundColor Green

# Step 4: Generate Prisma Client
Write-Host "`n[4/5] Generating Prisma client..." -ForegroundColor Yellow
pnpm --filter backend db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generating Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma client generated" -ForegroundColor Green

# Step 5: Start Development Servers
Write-Host "`n[5/5] Starting development servers (Backend + Frontend)..." -ForegroundColor Yellow
Write-Host "  Backend will run on: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Frontend will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the servers`n" -ForegroundColor Yellow

pnpm dev

