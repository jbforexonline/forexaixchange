# Spin Wheel - Integration & Testing Guide

## System Architecture Overview

### Backend Components
1. **Rounds System** (`backend/src/rounds/`)
   - `rounds.service.ts` - Round lifecycle management
   - `rounds-scheduler.service.ts` - Automated round creation and settlement
   - `rounds-settlement.service.ts` - Payout calculation and winner determination
   - `bets.service.ts` - Bet placement and validation
   - `autospin.service.ts` - Automated betting system

2. **Realtime System** (`backend/src/realtime/`)
   - `realtime.gateway.ts` - WebSocket server for live updates

3. **Database** (PostgreSQL + Prisma)
   - Rounds, Bets, Users, Wallets, Transactions

### Frontend Components
1. **Spin Wheel UI** (`frontend/src/Components/Spin/`)
   - `SpinWheel.tsx` - Visual wheel with 4 rings + indecision needles
   - `BetForm.tsx` - Betting interface

2. **Hooks** (`frontend/src/hooks/`)
   - `useRound.ts` - Round state management with WebSocket
   - `useWallet.ts` - Wallet balance tracking

3. **API Client** (`frontend/src/lib/api/spin.ts`)
   - HTTP API calls
   - WebSocket client integration

## How The System Works

### 1. Round Lifecycle
```
OPEN (20 min) → FROZEN (60 sec freeze) → SETTLING → SETTLED
```

- **OPEN**: Users can place bets
- **FROZEN**: Betting closed, waiting for settlement
- **SETTLING**: Calculating winners and payouts
- **SETTLED**: Results displayed, new round starts

### 2. Betting Markets (4 Rings)

#### Outer Ring - DIRECTION
- **BUY** vs **SELL**
- Payout: 1.8x

#### Middle Ring - COLOR  
- **BLUE** vs **RED**
- Payout: 1.8x

#### Inner Ring - VOLATILITY
- **HIGH_VOL** (2.2x payout) vs **LOW_VOL** (1.6x payout)

#### Global - INDECISION (Special)
- **INDECISION** - Wins when needle points vertically
- Payout: 3.0x (highest risk/reward)

### 3. Data Flow

#### Bet Placement Flow
```
User (Frontend) 
  → placeBet() API call 
  → BetsService validates 
  → Wallet balance checked 
  → Bet recorded in DB 
  → Funds moved to "held" 
  → WebSocket broadcast to all users
  → Frontend updates totals
```

#### Settlement Flow
```
Scheduler triggers settlement
  → Fetches market data (stubbed)
  → Determines winners for each ring
  → Calculates payouts using parimutuel model
  → Updates all bets (WON/LOST)
  → Releases held funds
  → Distributes winnings
  → WebSocket broadcast results
  → Frontend displays winners
```

## Integration Points

### 1. Frontend ↔ Backend HTTP API

**Endpoints Used:**
```
GET  /rounds/current          - Get active round
GET  /rounds/{id}/totals      - Get betting totals
POST /bets                    - Place bet
GET  /bets/current-round      - Get user's bets
GET  /wallet/balance          - Get wallet balance
```

### 2. Frontend ↔ Backend WebSocket

**Events Frontend Listens To:**
- `roundSettled` - New round started
- `totalsUpdated` - Betting totals changed
- `betPlaced` - Bet confirmed
- `heartbeat` - Connection check (every 1s)

**Events Backend Emits:**
- `roundSettled` - When round completes
- `totalsUpdated` - When bets change totals
- User-specific wallet updates

### 3. Backend Components Integration

```
RoundsScheduler (cron job)
  ↓
  Creates new rounds every 20 minutes
  ↓
RoundsService
  ↓
  Manages round state transitions
  ↓
RoundsSettlementService
  ↓
  Determines winners & payouts
  ↓
BetsService (validates & processes bets)
  ↓
PrismaService (database transactions)
  ↓
RealtimeGateway (broadcasts updates)
```

## Testing Strategy

### Phase 1: Backend Unit Testing

#### Test Rounds Service
```bash
cd backend
npm run test -- rounds.service.spec.ts
```

**Key Tests:**
- ✅ Create new round
- ✅ Freeze round after betting period
- ✅ Compute round totals correctly

#### Test Bets Service
```bash
npm run test -- bets.service.spec.ts
```

**Key Tests:**
- ✅ Place bet with valid data
- ✅ Reject bet with insufficient funds
- ✅ Reject bet when round frozen
- ✅ Validate bet limits (min $1, max $200 premium / $100 regular)

#### Test Settlement Service
```bash
npm run test -- rounds-settlement.service.spec.ts
```

**Key Tests:**
- ✅ Calculate parimutuel payouts correctly
- ✅ Distribute winnings to correct bets
- ✅ Update wallet balances atomically

### Phase 2: Backend Integration Testing

#### Start Backend Services
```bash
cd backend

# 1. Start PostgreSQL (if not running)
docker-compose up -d postgres redis

# 2. Run migrations
npm run db:migrate

# 3. Seed test data
npm run db:seed

# 4. Start backend server
npm run dev
```

**Expected Output:**
```
✓ NestJS application started on port 4000
✓ WebSocket server running
✓ Database connected
✓ Redis connected
✓ Scheduler started
```

#### Test Backend Endpoints

**Test 1: Get Current Round**
```bash
curl http://localhost:4000/rounds/current
```

Expected Response:
```json
{
  "round": {
    "id": "...",
    "roundNumber": 1,
    "state": "OPEN",
    "openedAt": "2025-11-26T...",
    "freezeAt": "2025-11-26T...",
    "settleAt": "2025-11-26T..."
  }
}
```

**Test 2: Place a Bet** (requires auth token)
```bash
# First login to get token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!"}'

# Then place bet with token
curl -X POST http://localhost:4000/bets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "market": "OUTER",
    "selection": "BUY",
    "amountUsd": 10
  }'
```

**Test 3: Check Wallet Balance**
```bash
curl http://localhost:4000/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Phase 3: Frontend Development Server

#### Start Frontend
```bash
cd frontend

# Set backend URL
# Create .env.local file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:4000" > .env.local

# Start dev server
npm run dev
```

**Expected Output:**
```
✓ Next.js dev server started on http://localhost:3000
```

### Phase 4: End-to-End Integration Testing

#### Test Scenario 1: Complete Betting Flow

1. **Navigate to Spin Page**
   - Open `http://localhost:3000/spin`
   - ✅ Wheel should load and display current round
   - ✅ Countdown timer should be counting down

2. **Check Round State**
   - ✅ Round number displayed
   - ✅ State badge shows "OPEN"
   - ✅ Betting form is enabled

3. **Place a Bet**
   - Select market: OUTER → BUY
   - Amount: $10
   - Click "PLACE BET"
   - ✅ Bet should be accepted
   - ✅ Wallet balance should decrease by $10
   - ✅ Bet should appear in "Your Active Bets" overlay
   - ✅ Round totals should update (OUTER/BUY increases)

4. **Test Different Markets**
   - Place bet on MIDDLE → BLUE ($25)
   - Place bet on INNER → HIGH_VOL ($50)
   - ✅ All bets should be recorded
   - ✅ Wallet held balance should increase

5. **Wait for Freeze**
   - Watch countdown approach freeze time
   - ✅ Betting form should disable
   - ✅ State changes to "FROZEN"
   - ✅ Status warning: "Betting Closed"

6. **Wait for Settlement**
   - Wait for settlement to complete
   - ✅ State changes to "SETTLED"
   - ✅ Winners highlighted on wheel (if implemented)
   - ✅ Wallet balance updated with winnings
   - ✅ New round starts automatically

#### Test Scenario 2: WebSocket Real-time Updates

1. **Open Two Browser Windows**
   - Window A: User 1 logged in
   - Window B: User 2 logged in

2. **User 1 Places Bet**
   - Place bet on OUTER → BUY ($10)
   - ✅ User 2 should see totals update in real-time
   - ✅ No page refresh needed

3. **User 2 Places Bet**
   - Place bet on OUTER → SELL ($20)
   - ✅ User 1 should see totals update
   - ✅ Both wheels show updated totals

4. **Check WebSocket Connection**
   - Open browser DevTools → Network → WS
   - ✅ WebSocket connection to `ws://localhost:4000` established
   - ✅ Heartbeat messages every 1 second
   - ✅ Events: `betPlaced`, `totalsUpdated`, `roundSettled`

#### Test Scenario 3: Indecision Needle Visual

1. **Check Needle Alignment**
   - ✅ Two golden needles (top/bottom) visible
   - ✅ Needles are perfectly vertical
   - ✅ Needles span all 4 rings continuously
   - ✅ NO dark blue gaps in needles
   - ✅ "INDECISION" text centered on each needle

2. **Test Indecision Bet**
   - Select market: GLOBAL (if available in UI)
   - Selection: INDECISION
   - Amount: $10
   - ✅ Bet accepted (higher risk, 3x payout)

#### Test Scenario 4: Error Handling

1. **Insufficient Funds**
   - Try to place bet > wallet balance
   - ✅ Error: "Insufficient funds"
   - ✅ Bet not placed

2. **Bet After Freeze**
   - Wait for freeze time
   - Try to place bet
   - ✅ Button disabled
   - ✅ Warning: "Betting Closed"

3. **Invalid Bet Amount**
   - Try bet < $1
   - ✅ Error: "Bet must be between $1 and $100"
   - Try bet > $100 (for non-premium)
   - ✅ Error displayed

4. **Network Error**
   - Stop backend server
   - Try to place bet
   - ✅ Error: "Failed to place bet"
   - ✅ Frontend remains stable

### Phase 5: Browser Testing (Visual Verification)

Since the spin wheel has complex SVG rendering, we should test it visually:

**Test Browser:**
1. Open http://localhost:3000/spin
2. Verify visual elements:
   - ✅ 4 concentric rings rendered correctly
   - ✅ Currency ring shows 30 currencies
   - ✅ Labels: BUY, SELL, BLUE, RED, HIGH VOLATILE, LOW VOLATILE
   - ✅ Golden indecision needles aligned vertically
   - ✅ Smooth animations/transitions
   - ✅ Countdown in center updates every second
   - ✅ Responsive on different screen sizes

**Testing the Fixes:**
1. ✅ INDECISION text is now centered on needles (was offset before)
2. ✅ Needles have no dark blue cuts (continuous golden path)
3. ✅ Needles perfectly aligned at 0° (top) and 180° (bottom)

## Quick Start Testing Commands

### Terminal 1 - Backend
```bash
cd D:\forexaixchange\backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd D:\forexaixchange\frontend
npm run dev
```

### Terminal 3 - Test Backend Health
```bash
# Check backend is running
curl http://localhost:4000/health

# Check current round
curl http://localhost:4000/rounds/current

# Check WebSocket (if wscat installed)
wscat -c ws://localhost:4000
```

### Browser
```
Open: http://localhost:3000/spin
Login: Use seeded test account
Test: Place bets and watch real-time updates
```

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 4000 is in use
netstat -ano | findstr :4000

# Check database connection
cd backend
npx prisma studio  # Opens DB admin UI
```

### Frontend Can't Connect to Backend
```bash
# Check .env.local exists
cat frontend/.env.local

# Should contain:
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### WebSocket Not Connecting
- Check CORS settings in `backend/src/realtime/realtime.gateway.ts`
- Verify WebSocket URL in `frontend/src/lib/websocket.ts`
- Check browser console for connection errors

### Database Issues
```bash
cd backend

# Reset database
npm run db:reset

# Re-run migrations
npm run db:migrate

# Re-seed data
npm run db:seed
```

## Success Criteria

### ✅ Backend Health
- [ ] Backend starts on port 4000
- [ ] Database connected
- [ ] WebSocket server running
- [ ] Scheduler creating rounds
- [ ] API endpoints responding

### ✅ Frontend Health
- [ ] Frontend starts on port 3000
- [ ] Can navigate to /spin
- [ ] Wheel renders correctly
- [ ] WebSocket connection established
- [ ] Real-time updates working

### ✅ Integration Health
- [ ] Can place bets successfully
- [ ] Wallet balance updates
- [ ] Round totals update in real-time
- [ ] Round lifecycle works (open → frozen → settled)
- [ ] Multiple users can bet simultaneously
- [ ] Settlement payouts calculated correctly

### ✅ Visual Fixes Verified
- [ ] Indecision needles perfectly vertical
- [ ] No dark blue cuts in needles
- [ ] INDECISION text centered on needles
- [ ] All 4 rings render correctly
- [ ] Labels positioned correctly

## Next Steps

1. **Run Backend**: Start PostgreSQL, Redis, and NestJS server
2. **Run Frontend**: Start Next.js dev server
3. **Visual Test**: Open browser and verify wheel rendering
4. **Functional Test**: Place bets and verify integration
5. **Multi-User Test**: Open multiple browsers and test real-time updates
6. **Settlement Test**: Wait for round to settle and verify payouts

---

**Ready to test?** Let's start both servers and verify everything works!

