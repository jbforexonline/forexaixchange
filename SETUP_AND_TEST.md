# Step-by-Step Setup and Testing Guide

## Prerequisites
- Node.js installed
- PostgreSQL database running
- Redis running (for caching)
- pnpm installed globally: `npm install -g pnpm`

---

## Step 1: Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install dependencies using pnpm
pnpm install
```

---

## Step 2: Database Migration

Create and run the migration for new models (AutoSpinOrder, UserPreferences):

```bash
# Navigate to backend (if not already there)
cd backend

# Option 1: Use npm script (recommended)
pnpm run db:migrate --name add_autospin_and_preferences

# Option 2: Direct Prisma command
pnpm prisma migrate dev --name add_autospin_and_preferences

# This will:
# 1. Create migration SQL file
# 2. Apply it to your database
# 3. Generate Prisma Client with new models
```

**If migration fails**, you can reset and migrate:
```bash
# ⚠️ WARNING: This will delete all data!
pnpm prisma migrate reset
pnpm run db:migrate --name add_autospin_and_preferences

# Or use script
pnpm run db:reset  # Resets and seeds database
```

**Generate Prisma client** (if needed separately):
```bash
pnpm run db:generate
# or
pnpm prisma generate
```

---

## Step 3: Verify Database Schema

Check that new tables were created:

```bash
# Open Prisma Studio to view database
pnpm prisma studio

# Or check database directly
# Tables should include:
# - AutoSpinOrder
# - UserPreferences
```

---

## Step 4: Start Backend Server

```bash
# From backend directory
# Development mode (with watch)
pnpm run dev

# Or production build:
pnpm run build
pnpm run start:prod

# Or standard start
pnpm start
```

Server should start on `http://localhost:3000` (or port from .env)

**Note**: The `postinstall` script in package.json will automatically run `prisma generate` after install

---

## Step 5: Verify API Documentation

1. Open browser to: `http://localhost:3000/api` (or your Swagger endpoint)
2. Verify new endpoints are visible:
   - `/autospin` - AutoSpin endpoints
   - `/suggestions` - Suggestions endpoints
   - `/chat` - Chat endpoints
   - `/preferences` - Preferences endpoints
   - `/bets/cancel/:betId` - Cancel bet endpoint

---

## Step 6: Test Endpoints

### A. Test Authentication (Required for all endpoints)

```bash
# Register a user (if needed)
POST http://localhost:3000/auth/register
{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com"
}

# Login to get JWT token
POST http://localhost:3000/auth/login
{
  "username": "testuser",
  "password": "password123"
}

# Save the token from response for next requests
```

### B. Test Preferences (Flexible Timing)

```bash
# Get preferences
GET http://localhost:3000/preferences
Authorization: Bearer <your-token>

# Update preferences (Premium required for roundDuration)
PUT http://localhost:3000/preferences
Authorization: Bearer <your-token>
{
  "preferredRoundDuration": 300,  // 5 minutes
  "autoSpinEnabled": true,
  "maxAutoSpinOrders": 50
}
```

### C. Test Auto-Spin Orders

```bash
# Create auto-spin order (Premium only)
POST http://localhost:3000/autospin
Authorization: Bearer <your-token>
{
  "market": "OUTER",
  "selection": "BUY",
  "amountUsd": 10,
  "roundsRemaining": 5
}

# Get user's auto-spin orders
GET http://localhost:3000/autospin
Authorization: Bearer <your-token>

# Get active orders count
GET http://localhost:3000/autospin/active/count
Authorization: Bearer <your-token>

# Cancel an auto-spin order
DELETE http://localhost:3000/autospin/:orderId
Authorization: Bearer <your-token>
```

### D. Test Suggestions

```bash
# Get suggestions for current round
GET http://localhost:3000/suggestions/current
Authorization: Bearer <your-token>

# Get suggestions for specific round
GET http://localhost:3000/suggestions/round/:roundId
Authorization: Bearer <your-token>
```

**Note**: Suggestions require at least 3 bets on the round

### E. Test Cancel Bet

```bash
# First, place a bet
POST http://localhost:3000/bets
Authorization: Bearer <your-token>
{
  "roundId": "<current-round-id>",
  "market": "OUTER",
  "selection": "BUY",
  "amountUsd": 10
}

# Then cancel it (Premium only, before freeze)
POST http://localhost:3000/bets/cancel/:betId
Authorization: Bearer <your-token>
```

### F. Test Chat

```bash
# Send a message (GENERAL room - all users)
POST http://localhost:3000/chat
Authorization: Bearer <your-token>
{
  "content": "Hello everyone!",
  "roomType": "GENERAL"
}

# Send to PREMIUM room (Premium/Verified only)
POST http://localhost:3000/chat
Authorization: Bearer <your-token>
{
  "content": "Premium chat message",
  "roomType": "PREMIUM"
}

# Get messages for a room
GET http://localhost:3000/chat/GENERAL
Authorization: Bearer <your-token>

# Delete message (Admin only)
DELETE http://localhost:3000/chat/message/:messageId
Authorization: Bearer <admin-token>
Body: { "reason": "Spam" }
```

---

## Step 7: Test Premium Features

To test premium-only features, you need a premium user:

```bash
# Subscribe to premium (requires wallet balance)
POST http://localhost:3000/premium/subscribe/:planId
Authorization: Bearer <your-token>

# Or manually set premium in database:
# UPDATE "User" SET "premium" = true, "premiumExpiresAt" = '2025-12-31' WHERE "username" = 'testuser';
```

Then test:
- ✅ Auto-spin orders
- ✅ Cancel bets
- ✅ Flexible spin timing
- ✅ Internal transfers
- ✅ Unlimited withdrawals
- ✅ Premium chatroom

---

## Step 8: Test Settlement Logic (0-0 Tie)

To test the updated tie detection where 0-0 triggers Indecision:

1. Create a round manually or wait for scheduler
2. Place bets on layers so one layer has 0-0 (no bets on either side)
3. Settle the round
4. Verify that Indecision wins when any layer is 0-0

---

## Step 9: Verify Once-Per-Day Affiliate Payout

```bash
# Make a deposit for a referred user
POST http://localhost:3000/wallet/deposit
Authorization: Bearer <referred-user-token>
{
  "amount": 100,
  "method": "MoMo",
  "reference": "test-ref-123"
}

# First deposit should trigger affiliate commission immediately
# Second deposit same day should NOT pay immediately (once-per-day rule)

# Check affiliate earnings
GET http://localhost:3000/affiliate/stats
Authorization: Bearer <affiliate-token>
```

---

## Troubleshooting

### Migration Issues

```bash
# If migration fails, check schema syntax
pnpm prisma format

# Regenerate Prisma client
pnpm prisma generate

# Check database connection
# Verify DATABASE_URL in .env file
```

### Missing Dependencies

```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Type Errors

```bash
# Regenerate Prisma client
pnpm prisma generate

# Rebuild TypeScript
pnpm run build
```

### Port Already in Use

```bash
# Change port in .env or kill process using port
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000
```

---

## Quick Test Checklist

- [ ] Backend starts without errors
- [ ] Prisma Studio shows new tables (AutoSpinOrder, UserPreferences)
- [ ] Swagger shows new endpoints
- [ ] Can create preferences (premium for duration)
- [ ] Can create auto-spin order (premium)
- [ ] Can cancel auto-spin order
- [ ] Can get suggestions (after 3 bets)
- [ ] Can cancel bet (premium, before freeze)
- [ ] Can send chat message
- [ ] Can get chat messages
- [ ] Affiliate payout respects once-per-day rule
- [ ] 0-0 tie triggers Indecision in settlement

---

## Next Steps After Testing

1. Commit changes to japhet branch:
```bash
git add .
git commit -m "feat: implement remaining premium features

- Auto-spin orders (up to 50)
- Cancel bets (premium only)
- Suggestions based on first 3 orders
- Flexible spin timing (5/10/20 min)
- Once-per-day affiliate payout
- Community chatroom (premium/verified)
- Updated tie detection (0-0 triggers Indecision)"
```

2. Push to remote:
```bash
git push -u origin japhet
```

3. Create Pull Request when ready

---

## Environment Variables Check

Ensure these are set in `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
JWT_SECRET=your-secret-key
```

---

Good luck testing! 🚀

