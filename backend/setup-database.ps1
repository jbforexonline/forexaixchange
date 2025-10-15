# PowerShell script to set up PostgreSQL database with correct encoding
Write-Host "Setting up PostgreSQL database for ForexAI Exchange..." -ForegroundColor Green

# Check if PostgreSQL is installed
try {
    $psqlVersion = psql --version
    Write-Host "PostgreSQL found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creating database with UTF8 encoding..." -ForegroundColor Yellow

# Create database with template0 to avoid encoding issues
try {
    psql -U postgres -c "CREATE DATABASE forexaixchange WITH TEMPLATE template0 ENCODING 'UTF8';"
    Write-Host "✅ Database 'forexaixchange' created successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database might already exist, continuing..." -ForegroundColor Yellow
}

# Create user with password 1234
try {
    psql -U postgres -c "CREATE USER fx WITH PASSWORD '1234';"
    Write-Host "✅ User 'fx' created successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ User might already exist, continuing..." -ForegroundColor Yellow
}

# Grant privileges
try {
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE forexaixchange TO fx;"
    psql -U postgres -c "ALTER USER fx CREATEDB;"
    Write-Host "✅ Privileges granted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error granting privileges" -ForegroundColor Red
}

Write-Host ""
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. npm run db:migrate" -ForegroundColor White
Write-Host "2. npm run db:seed" -ForegroundColor White
Write-Host "3. npm run start" -ForegroundColor White
Write-Host ""
Write-Host "Your database connection:" -ForegroundColor Cyan
Write-Host "postgresql://fx:1234@127.0.0.1:5432/forexaixchange" -ForegroundColor White
