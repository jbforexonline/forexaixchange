# ForexAI Exchange Backend Setup

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- Redis (optional, for caching)

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://fx:fxpass@localhost:5433/forexaixchange"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=4000
NODE_ENV="development"

# Redis Configuration (if using Redis)
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# CORS Configuration
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL and Redis:**
   ```bash
   docker-compose up -d
   ```

3. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Seed the database with initial data:**
   ```bash
   npm run db:seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Documentation

Once the server is running, you can access the Swagger documentation at:
- **Swagger UI:** http://localhost:4000/api/docs

## Default Accounts

After seeding, you'll have these default accounts:

### Super Admin
- **Email:** superadmin@forexaixchange.com
- **Password:** admin123
- **Role:** SUPER_ADMIN

### Admin
- **Email:** admin@forexaixchange.com
- **Password:** admin123
- **Role:** ADMIN

## API Endpoints Overview

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/profile` - Get current user profile

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `POST /users/:id/ban` - Ban user (Admin only)
- `POST /users/:id/unban` - Unban user (Admin only)

### Wallet
- `GET /wallet/balance` - Get wallet balance
- `POST /wallet/deposit` - Create deposit request
- `POST /wallet/withdraw` - Create withdrawal request
- `POST /wallet/transfer` - Create internal transfer

### Spins
- `POST /spins` - Create a new spin
- `GET /spins/history` - Get user spin history
- `GET /spins/stats` - Get user spin statistics
- `GET /spins/sentiment` - Get community sentiment

### Premium
- `GET /premium/plans` - Get available premium plans
- `POST /premium/subscribe/:planId` - Subscribe to premium plan
- `GET /premium/subscription` - Get user subscription

### Affiliate
- `GET /affiliate` - Get user affiliate data
- `GET /affiliate/stats` - Get affiliate statistics (Admin only)

### Admin
- `GET /admin/dashboard` - Get admin dashboard statistics
- `GET /admin/activity` - Get recent activity
- `GET /admin/config` - Get system configuration

## Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- **User** - User accounts with roles and verification
- **Wallet** - User wallet with available/held balances
- **Transaction** - Financial transactions (deposits, withdrawals, etc.)
- **Spin** - Spin-based trading game records
- **PremiumPlan** - Premium subscription plans
- **AffiliateEarning** - Affiliate commission tracking
- **InternalTransfer** - Internal user-to-user transfers

## Rate Limiting

The API implements rate limiting with the following tiers:
- **Short:** 10 requests per second
- **Medium:** 100 requests per minute
- **Long:** 1000 requests per 15 minutes

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Request validation with class-validator
- CORS protection
- Rate limiting
- Input sanitization

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed

# Reset and seed database
npm run db:reset

# Lint code
npm run lint

# Format code
npm run format
```
