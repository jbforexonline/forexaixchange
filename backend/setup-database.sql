-- ForexAI Exchange Database Setup
-- Run this script in your PostgreSQL database

-- Create database (run as superuser)
-- CREATE DATABASE forexaixchange;

-- Connect to the database and run the following:

-- Create user
CREATE USER fx WITH PASSWORD 'fxpass';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE forexaixchange TO fx;
GRANT ALL PRIVILEGES ON SCHEMA public TO fx;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fx;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fx;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fx;

-- Verify the setup
\du fx
\l forexaixchange

