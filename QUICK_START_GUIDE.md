# 🚀 ForexAiXchange - Quick Start Guide

## Complete Setup & Test Instructions

---

## 📋 Prerequisites

Make sure you have installed:
- ✅ Node.js (v18 or higher)
- ✅ PostgreSQL database running
- ✅ Redis (optional, for caching)
- ✅ Git

---

## 🎯 Step-by-Step Setup

### Step 1: Backend Setup

#### 1.1 Navigate to Backend
```bash
cd backend
```

#### 1.2 Install Dependencies
```bash
npm install
```

#### 1.3 Set Up Environment Variables

Create `.env` file in `backend` folder:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/forexaixchange?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"

# Redis (optional, for caching)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Twilio (optional, for SMS)
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="your_twilio_phone_number"

# Email (optional, for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### 1.4 Generate Prisma Client
```bash
npm run db:generate
```

#### 1.5 Run Database Migrations
```bash
npm run db:migrate
```

#### 1.6 Seed Database with Test Users
```bash
npm run db:seed
```

**Output will show:**
```
✅ Database seeding completed!

👑 ADMIN ACCOUNTS:
📧 Super Admin Email: superadmin@forexaixchange.com
🔑 Password: admin123
💰 Balance: $10,000 (Premium)

📧 Admin Email: admin@forexaixchange.com
🔑 Password: admin123
💰 Balance: $5,000 (Premium)

👤 TEST USER ACCOUNTS:
📧 User 1: user1@test.com | Password: password123 | $2,500 (Premium)
📧 User 2: user2@test.com | Password: password123 | $1,500 (Regular)
📧 Premium: premium@test.com | Password: password123 | $10,000 (Premium)
```

#### 1.7 Start Backend Server
```bash
npm run dev
```

**Backend will run on:** `http://localhost:4000`

✅ **Backend is ready!**

---

### Step 2: Frontend Setup

#### 2.1 Open New Terminal & Navigate to Frontend
```bash
cd frontend
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Set Up Environment Variables

Create `.env.local` file in `frontend` folder:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

#### 2.4 Start Frontend Server
```bash
npm run dev
```

**Frontend will run on:** `http://localhost:3000`

✅ **Frontend is ready!**

---

## 🎮 Testing the Spin Game

### Step 3: Login & Access Game

#### 3.1 Open Browser
Navigate to: `http://localhost:3000`

#### 3.2 Login with Test Account

**For Premium User (Recommended for full features):**
- Email: `premium@test.com`
- Password: `password123`
- Balance: $10,000
- Features: Cancel bets, higher limits ($200/bet)

**For Regular User:**
- Email: `user2@test.com`
- Password: `password123`
- Balance: $1,500
- Limit: $1000/bet

**For Admin:**
- Email: `superadmin@forexaixchange.com`
- Password: `admin123`
- Balance: $10,000

#### 3.3 Navigate to Spin Page
After login, go to: `/dashboard/spin`

✅ **You're in the game!**

---

## 🎰 Testing the Game

### Test Scenario 1: Basic Betting

**1. Wait for Round to Open**
- Countdown should show (1 minute = 60 seconds in dev mode)
- Status should show "OPEN - Place Your Bets!"

**2. Place a Bet**
- Select a market (e.g., OUTER)
- Choose a side (e.g., BUY)
- Enter amount (e.g., $10)
- Click "Place Bet"

**3. Watch Your Bet**
- Bet appears in "Your Active Bets" panel
- Balance deducts immediately
- Live totals update on game board

**4. Wait for Settlement**
- Freeze warning appears at 10 seconds
- Betting closes at 5 seconds
- Round settles automatically at 0 seconds

**5. Check Results**
- Results panel shows win/loss
- Balance updates automatically
- New round opens immediately

---

### Test Scenario 2: Multiple Markets

**Try betting on different markets in the same round:**

1. **OUTER (Direction):**
   - Bet $5 on BUY or SELL

2. **MIDDLE (Color Mode):**
   - Bet $5 on BLUE or RED

3. **INNER (Volatility):**
   - Bet $5 on HIGH_VOL or LOW_VOL

4. **GLOBAL (Indecision):**
   - Bet $10 on INDECISION

**Settlement will handle each pair independently!**

---

### Test Scenario 3: Indecision Trigger

**To test indecision override:**

1. Open multiple browser windows/incognito tabs
2. Login with different accounts
3. Have users bet equal amounts on both sides of any pair:
   - User 1: $10 on BUY
   - User 2: $10 on SELL
   - User 3: $20 on INDECISION

**Result:** Indecision wins, all layer bets lose!

---

### Test Scenario 4: Premium Features

**Login as Premium User (`premium@test.com`):**

1. **Higher Bet Limit:**
   - Try betting up to $200 per bet

2. **Cancel Bet:**
   - Place a bet
   - Click "Cancel Bet" button (before freeze time)
   - Funds return to your balance

---

## 🔍 What to Verify

### ✅ Round Lifecycle:
- [ ] Round opens automatically
- [ ] Countdown displays (60 seconds)
- [ ] Freeze warning at 10 seconds
- [ ] Betting closes at 5 seconds
- [ ] Settlement happens at 0 seconds
- [ ] New round opens automatically

### ✅ Betting:
- [ ] Can select all markets
- [ ] Can place bets
- [ ] Balance deducts immediately
- [ ] Bets appear in active panel
- [ ] Cannot bet during freeze

### ✅ Settlement:
- [ ] Minority rule works (less money wins)
- [ ] Winners get 2x payout
- [ ] Losers get 0
- [ ] Indecision triggers on ties
- [ ] All bets lose when indecision triggers

### ✅ Real-time Updates:
- [ ] Live totals update
- [ ] Power bars animate
- [ ] Balance updates instantly
- [ ] WebSocket connection stable

### ✅ UI/UX:
- [ ] Loading states display
- [ ] Error messages clear
- [ ] Animations smooth
- [ ] Mobile responsive

---

## 📊 Test Users Summary

| Account | Email | Password | Balance | Type | Features |
|---------|-------|----------|---------|------|----------|
| **Super Admin** | superadmin@forexaixchange.com | admin123 | $10,000 | Premium | Full admin access |
| **Admin** | admin@forexaixchange.com | admin123 | $5,000 | Premium | Admin access |
| **Premium User** | premium@test.com | password123 | $10,000 | Premium | Cancel bets, $200 limit |
| **Test User 1** | user1@test.com | password123 | $2,500 | Premium | Cancel bets, $200 limit |
| **Test User 2** | user2@test.com | password123 | $1,500 | Regular | $1000 limit |

---

## 🐛 Troubleshooting

### Backend Won't Start

**Issue:** Port 4000 already in use
```bash
# Find and kill process using port 4000 (Windows)
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Or change port in .env
PORT=4001
```

**Issue:** Database connection error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

**Issue:** Prisma error
```bash
# Reset and regenerate
npm run db:generate
npm run db:migrate
npm run db:seed
```

---

### Frontend Won't Connect

**Issue:** Can't connect to backend
- Verify backend is running on port 4000
- Check `NEXT_PUBLIC_BACKEND_URL` in .env.local
- Clear browser cache

**Issue:** WebSocket not connecting
- Check Socket.IO is initialized
- Verify firewall settings
- Check browser console for errors

---

### Database Issues

**Reset database and start fresh:**
```bash
cd backend
npm run db:reset
```

This will:
1. Drop all tables
2. Run migrations
3. Seed test users

---

## 🎯 Quick Commands Reference

### Backend Commands:
```bash
cd backend

# Start development server
npm run dev

# Database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed

# Reset database (drop + migrate + seed)
npm run db:reset

# Build for production
npm run build

# Start production
npm run start:prod
```

### Frontend Commands:
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production
npm run start
```

---

## 📱 Testing on Mobile

### Option 1: Use Ngrok (Expose Local Server)
```bash
# Install ngrok
npm install -g ngrok

# Expose backend
ngrok http 4000

# Update frontend .env.local with ngrok URL
NEXT_PUBLIC_BACKEND_URL=https://your-ngrok-url.ngrok.io
```

### Option 2: Use Local Network IP
```bash
# Find your local IP (Windows)
ipconfig

# Update .env files to use local IP
# Backend .env
FRONTEND_URL="http://192.168.x.x:3000"

# Frontend .env.local
NEXT_PUBLIC_BACKEND_URL=http://192.168.x.x:4000

# Access from phone: http://192.168.x.x:3000
```

---

## 🎉 Success Checklist

Before declaring success, verify:

- ✅ Backend running without errors
- ✅ Frontend running without errors
- ✅ Database seeded with test users
- ✅ Can login successfully
- ✅ Spin page loads
- ✅ Can see countdown timer
- ✅ Can place bets
- ✅ Balance updates correctly
- ✅ Round settles automatically
- ✅ Results display correctly
- ✅ WebSocket events working

---

## 📞 Need Help?

**Check logs:**
- Backend: Terminal where you ran `npm run dev`
- Frontend: Browser console (F12)
- Database: Check Prisma Studio (`npx prisma studio`)

**Common issues:**
1. Database not created → Create database manually
2. Port conflicts → Change ports in .env
3. WebSocket issues → Check CORS settings
4. Prisma errors → Run `npm run db:generate`

---

## 🚀 Production Deployment

**Before deploying to production:**

1. **Environment:**
   - Set `NODE_ENV=production`
   - Change JWT_SECRET to strong secret
   - Update FRONTEND_URL to production URL

2. **Database:**
   - Use production PostgreSQL
   - Run migrations: `npm run db:migrate:deploy`

3. **Security:**
   - Enable HTTPS
   - Configure proper CORS
   - Add rate limiting
   - Set up monitoring

4. **Round Duration:**
   - Currently: 1 minute (dev)
   - Production: Set to 20 minutes
   - Configured automatically based on NODE_ENV

---

## ✨ You're All Set!

**Next Steps:**
1. ✅ Follow the setup steps above
2. ✅ Seed the database
3. ✅ Start both servers
4. ✅ Login with test account
5. ✅ Navigate to spin page
6. ✅ Start testing!

**Happy Testing!** 🎰🎉

---

**Quick Start Time:** ~10 minutes
**First Spin Test:** ~1 minute (round duration)
**Full Testing:** ~30 minutes

**Let's spin and win!** 🚀

