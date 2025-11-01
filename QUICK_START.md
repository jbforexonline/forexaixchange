# Quick Start Guide - pnpm Commands

## 🚀 Quick Setup (Copy & Paste)

```bash
# 1. Install dependencies
cd backend
pnpm install

# 2. Run database migration
pnpm run db:migrate --name add_autospin_and_preferences

# 3. Generate Prisma client
pnpm run db:generate

# 4. Start development server
pnpm run dev
```

---

## 📋 Common pnpm Commands

### Dependencies
```bash
pnpm install              # Install all dependencies
pnpm install <package>    # Add new package
pnpm update              # Update all dependencies
pnpm remove <package>    # Remove package
```

### Database (Prisma)
```bash
pnpm run db:migrate                              # Create and apply migration
pnpm run db:migrate:deploy                       # Deploy migrations (production)
pnpm run db:generate                             # Generate Prisma Client
pnpm run db:seed                                 # Seed database
pnpm run db:reset                                # Reset DB and reseed
pnpm prisma studio                                # Open Prisma Studio (GUI)
pnpm prisma format                                # Format schema.prisma
```

### Development
```bash
pnpm run dev           # Start in watch mode (recommended)
pnpm run build         # Build for production
pnpm run start         # Start production build
pnpm run start:prod    # Start production server
pnpm run lint          # Run linter (if configured)
pnpm run format        # Format code with Prettier
```

### Testing API
```bash
# Using curl (PowerShell)
curl -X GET http://localhost:3000/health

# Using PowerShell Invoke-WebRequest
Invoke-WebRequest -Uri http://localhost:3000/health

# Using Postman or Insomnia
# Import Swagger JSON from http://localhost:3000/api-json
```

---

## 🔧 Troubleshooting

### Clear cache and reinstall
```bash
rm -rf node_modules .pnpm-store
pnpm install
```

### Reset database
```bash
pnpm run db:reset  # ⚠️ Deletes all data!
```

### Check Prisma connection
```bash
pnpm prisma db pull  # Pull current DB schema
pnpm prisma validate # Validate schema.prisma
```

---

## 📝 Environment Setup

Create `backend/.env` if not exists:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/forexaixchange"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

---

## ✅ Verification Checklist

After setup, verify:

1. ✅ Dependencies installed: `pnpm list` shows no errors
2. ✅ Database connected: `pnpm prisma studio` opens
3. ✅ Migration applied: New tables visible in Prisma Studio
4. ✅ Server starts: No errors in console, health endpoint works
5. ✅ Swagger docs: `http://localhost:3000/api` shows all endpoints

---

## 🎯 Testing New Features

### Test Auto-Spin
```bash
# 1. Get JWT token (login)
# 2. Create auto-spin order
POST /autospin
Authorization: Bearer <token>
Body: { "market": "OUTER", "selection": "BUY", "amountUsd": 10, "roundsRemaining": 5 }
```

### Test Cancel Bet
```bash
# 1. Place a bet
POST /bets
# 2. Cancel it (premium only)
POST /bets/cancel/:betId
```

### Test Suggestions
```bash
# After 3 bets are placed on a round
GET /suggestions/current
```

### Test Chat
```bash
POST /chat
Body: { "content": "Hello!", "roomType": "GENERAL" }
```

---

That's it! 🎉

