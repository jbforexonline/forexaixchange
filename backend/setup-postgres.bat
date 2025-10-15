@echo off
echo Setting up PostgreSQL for ForexAI Exchange...
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL from: https://www.postgresql.org/download/
    echo.
    echo Alternative: Use Docker Desktop
    echo 1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo 2. Run: docker-compose up -d
    pause
    exit /b 1
)

echo PostgreSQL found! Setting up database...

REM Create database and user with correct encoding
psql -U postgres -c "CREATE DATABASE forexaixchange WITH TEMPLATE template0 ENCODING 'UTF8';" 2>nul
psql -U postgres -c "CREATE USER fx WITH PASSWORD '1234';" 2>nul
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE forexaixchange TO fx;" 2>nul
psql -U postgres -c "ALTER USER fx CREATEDB;" 2>nul

echo.
echo Database setup complete!
echo.
echo Now run these commands:
echo   npm run db:migrate
echo   npm run db:seed
echo   npm run dev
echo.
pause
