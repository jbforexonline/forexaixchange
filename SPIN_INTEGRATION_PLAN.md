# Spin Integration Plan & Verification Guide

## Overview
This document outlines the plan to fully integrate the spin functionality between frontend and backend, ensuring real-time synchronization and accurate data reflection.

---

## PHASE 1: Backend API Enhancement

### 1.1 Update `getCurrentRound` Endpoint
**File**: `backend/src/rounds/rounds.controller.ts`

**Issue**: Current endpoint doesn't return winner fields for settled rounds

**Fix**: Include winner fields when round is SETTLED

```typescript
@Get('current')
async getCurrentRound() {
  const round = await this.roundsService.getCurrentRound();
  
  if (!round) {
    return { message: 'No active round. New round opening soon...', round: null };
  }

  return {
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      state: round.state,
      openedAt: round.openedAt,
      freezeAt: round.freezeAt,
      settleAt: round.settleAt,
      roundDuration: round.roundDuration,
      commitHash: round.artifact?.commitHash,
      betsCount: round._count?.bets || 0,
      // ADD THESE FIELDS FOR SETTLED ROUNDS:
      outerWinner: round.outerWinner,
      middleWinner: round.middleWinner,
      innerWinner: round.innerWinner,
      indecisionTriggered: round.indecisionTriggered,
      outerTied: round.outerTied,
      middleTied: round.middleTied,
      innerTied: round.innerTied,
    },
  };
}
```

**Why**: Frontend needs winner data to display on SpinWheel when round is settled

---

## PHASE 2: Frontend API Interface Updates

### 2.1 Update Round Interface
**File**: `frontend/src/lib/api/spin.ts`

**Current**:
```typescript
export interface Round {
  id: string;
  roundNumber: number;
  state: 'OPEN' | 'FROZEN' | 'SETTLING' | 'SETTLED';
  openedAt: string;
  freezeAt: string;
  settleAt: string;
  roundDuration: number;
  commitHash?: string;
  betsCount?: number;
}
```

**Updated**:
```typescript
export interface Round {
  id: string;
  roundNumber: number;
  state: 'OPEN' | 'FROZEN' | 'SETTLING' | 'SETTLED';
  openedAt: string;
  freezeAt: string;
  settleAt: string;
  roundDuration: number;
  commitHash?: string;
  betsCount?: number;
  // Winner fields (only present when state === 'SETTLED')
  outerWinner?: string | null;
  middleWinner?: string | null;
  innerWinner?: string | null;
  indecisionTriggered?: boolean;
  outerTied?: boolean;
  middleTied?: boolean;
  innerTied?: boolean;
}
```

---

## PHASE 3: SpinPage Component Integration

### 3.1 Add Winners Extraction Logic
**File**: `frontend/src/Components/Dashboard/SpinPage.tsx`

**Current Issue**: `winners={undefined}` is hardcoded

**Fix**: Extract winners from round data when settled

**Add this function inside SpinPage component**:
```typescript
// Extract winners from round data (for settled rounds)
const extractWinners = useMemo(() => {
  if (roundState !== 'settled' || !round) return undefined;
  
  // If indecision was triggered, all pairs lose
  if (round.indecisionTriggered) {
    return {
      indecision: true,
      outer: undefined,
      color: undefined,
      vol: undefined,
    };
  }
  
  // Extract winners from round data
  return {
    outer: round.outerWinner || undefined,
    color: round.middleWinner || undefined,
    vol: round.innerWinner || undefined,
    indecision: false,
  };
}, [roundState, round]);
```

**Update SpinWheel props**:
```typescript
<SpinWheel 
  state={roundState} 
  countdownSec={displayCountdown} 
  winners={extractWinners}  // Use extracted winners instead of undefined
/>
```

### 3.2 Handle WebSocket `roundSettled` Event
**File**: `frontend/src/Components/Dashboard/SpinPage.tsx`

**Add listener for roundSettled event**:
```typescript
useEffect(() => {
  const wsClient = getWebSocketClient();
  
  // Listen for round settlement
  const unsubscribeSettled = wsClient.on('roundSettled', (data) => {
    console.log('Round settled via WebSocket:', data);
    // Refresh round data to get winner information
    // This will trigger useRound hook to refetch
  });
  
  return unsubscribeSettled;
}, []);
```

**Note**: The `useRound` hook already handles `roundSettled` and refetches round data, so winners should auto-update.

---

## PHASE 4: useRound Hook Enhancement

### 4.1 Ensure Winner Data is Preserved
**File**: `frontend/src/hooks/useRound.ts`

**Current**: Hook fetches round but doesn't preserve winner fields

**Fix**: Already handled by Round interface update - just ensure the data flows through

**Verify**: The `fetchRound` function stores the complete round object including winner fields

---

## PHASE 5: Verification & Testing Checklist

### 5.1 Backend Verification

#### Test 1: API Response Contains Winner Fields
**Endpoint**: `GET /rounds/current`

**Steps**:
1. Wait for a round to settle
2. Call `/rounds/current` 
3. Verify response includes:
   - `outerWinner`: "BUY" or "SELL" or null
   - `middleWinner`: "BLUE" or "RED" or null
   - `innerWinner`: "HIGH_VOL" or "LOW_VOL" or null
   - `indecisionTriggered`: boolean

**Expected**: All fields present when `state === 'SETTLED'`

#### Test 2: WebSocket `roundSettled` Event
**Event**: `roundSettled`

**Steps**:
1. Connect to WebSocket
2. Wait for round to settle
3. Listen for `roundSettled` event

**Expected Event Data**:
```json
{
  "roundId": "string",
  "roundNumber": 123,
  "indecisionTriggered": false,
  "winners": {
    "outer": { "winner": "BUY", "tied": false },
    "middle": { "winner": "BLUE", "tied": false },
    "inner": { "winner": "HIGH_VOL", "tied": false }
  }
}
```

---

### 5.2 Frontend Verification

#### Test 3: Round Data Flow
**Component**: `SpinPage`

**Steps**:
1. Open spin page
2. Wait for round to settle
3. Check browser console for round data
4. Verify `round.outerWinner`, `round.middleWinner`, `round.innerWinner` are present

**Expected**: Round object contains winner fields

#### Test 4: Winners Display on Wheel
**Component**: `SpinWheel`

**Steps**:
1. Wait for round to settle
2. Verify SpinWheel receives `winners` prop with correct data
3. Verify winning segments are highlighted on wheel

**Expected Visual**:
- Winning segments (BUY/SELL, BLUE/RED, HIGH/LOW) glow/highlight
- If indecision triggered, indecision needles glow

#### Test 5: Real-time Updates
**Components**: All

**Steps**:
1. Place a bet
2. Verify totals update immediately (via `totalsUpdated` WebSocket event)
3. Verify wallet balance updates immediately (via `walletUpdated` event)
4. Wait for round to freeze
5. Verify state changes from "open" to "frozen"
6. Wait for round to settle
7. Verify state changes from "frozen" to "settled"
8. Verify winners appear on wheel

**Expected**: All updates happen in real-time without page refresh

#### Test 6: Countdown Accuracy
**Component**: `SpinWheel` center display

**Steps**:
1. Note the countdown seconds displayed
2. Compare with backend `freezeAt` and `settleAt` timestamps
3. Verify countdown decreases by 1 every second
4. Verify freeze warning appears 60 seconds before freeze

**Expected**: Frontend countdown matches backend timestamps exactly

#### Test 7: Bet Placement Verification
**Component**: `BetForm`

**Steps**:
1. Place a bet for $10 on BUY
2. Verify bet appears in "Your Active Bets" section immediately
3. Verify wallet balance decreases by $10 immediately (available decreases, held increases)
4. Verify totals update immediately (BUY total increases by $10)
5. Check backend: Verify bet exists in database with correct roundId

**Expected**: 
- Frontend updates immediately
- Backend reflects bet immediately
- Wallet balance changes immediately

#### Test 8: Settlement Verification
**Component**: `SpinPage`

**Steps**:
1. Place bets on different markets (BUY, SELL, BLUE, RED, HIGH_VOL, LOW_VOL)
2. Wait for round to settle
3. Verify:
   - Winners displayed correctly on wheel
   - Wallet balance updates (winners get 2x payout, losers lose 100%)
   - User's bet status updates (isWinner flag)
   - Payout amounts correct

**Expected**:
- Winner receives: bet amount × 2 (e.g., $10 bet → $20 total, $10 profit)
- Loser loses: 100% of bet (e.g., $10 bet → $0 returned)

---

## PHASE 6: Integration Steps (Execution Order)

### Step 1: Backend Changes (Do First)
1. ✅ Update `rounds.controller.ts` - Add winner fields to `getCurrentRound` response
2. ✅ Test endpoint returns winner fields for settled rounds
3. ✅ Verify WebSocket `roundSettled` event includes winners

### Step 2: Frontend Interface Updates
1. ✅ Update `Round` interface in `spin.ts` to include winner fields
2. ✅ Verify TypeScript compiles without errors

### Step 3: Component Updates
1. ✅ Update `SpinPage.tsx` - Add winners extraction logic
2. ✅ Update `SpinWheel` props to use extracted winners
3. ✅ Add WebSocket listener for `roundSettled` (if not already handled by useRound)

### Step 4: Testing
1. ✅ Run all verification tests above
2. ✅ Test with multiple rounds (settle several rounds)
3. ✅ Test edge cases:
   - Round with no bets
   - Round with indecision (tied pairs)
   - Round with only one side having bets

---

## PHASE 7: Common Issues & Debugging

### Issue 1: Winners Not Displaying
**Symptoms**: Round settles but wheel doesn't show winners

**Debug Steps**:
1. Check browser console for round data - verify `round.outerWinner` exists
2. Check `extractWinners` function - verify it returns correct format
3. Check SpinWheel props - verify `winners` prop is passed correctly
4. Check SpinWheel component - verify it handles winners correctly

**Fix**: Ensure round data includes winner fields from backend

### Issue 2: Countdown Not Accurate
**Symptoms**: Countdown doesn't match backend timestamps

**Debug Steps**:
1. Check browser console - log `round.freezeAt` and `round.settleAt`
2. Compare with displayed countdown
3. Check `updateCountdown` function in `useRound.ts`
4. Verify timezone handling (backend uses UTC, frontend uses local)

**Fix**: Ensure time calculations use same timezone/reference

### Issue 3: Totals Not Updating
**Symptoms**: Bet placed but totals don't change

**Debug Steps**:
1. Check WebSocket connection status
2. Check browser console for `totalsUpdated` events
3. Check Redis - verify totals stored correctly
4. Check `useRound` hook - verify it listens to `totalsUpdated`

**Fix**: Ensure WebSocket connected and events are being received

### Issue 4: Wallet Balance Not Updating
**Symptoms**: Bet placed but balance doesn't change

**Debug Steps**:
1. Check WebSocket `walletUpdated` event received
2. Check `useWallet` hook - verify it listens to `walletUpdated`
3. Check backend - verify wallet update happens in database
4. Check API response - verify wallet endpoint returns correct balance

**Fix**: Ensure wallet WebSocket events are properly handled

---

## PHASE 8: Verification Commands

### Backend API Test
```bash
# Get current round
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/rounds/current

# Should return round with winner fields if settled
```

### Frontend Console Tests
```javascript
// In browser console on spin page
// Check round data
console.log('Round:', window.__DEBUG_ROUND__);

// Check winners extraction
const round = /* get from useRound hook */;
const winners = round?.indecisionTriggered 
  ? { indecision: true } 
  : {
      outer: round?.outerWinner,
      color: round?.middleWinner,
      vol: round?.innerWinner,
    };
console.log('Winners:', winners);
```

---

## Success Criteria

✅ **Integration is successful when**:

1. Backend returns winner fields for settled rounds
2. Frontend receives and stores winner fields correctly
3. SpinWheel displays winners correctly when round settles
4. Real-time updates work (totals, wallet, state changes)
5. Countdown timers match backend exactly
6. Bet placement updates UI immediately
7. Settlement updates wallet balances correctly (2x for winners, 0 for losers)

---

## Next Steps After Integration

1. Add Community Sentiment Bars (Power Bars)
2. Add Previous Round Results display
3. Add Bet History panel
4. Add Premium cancel bet functionality UI
5. Add Auto-spin UI
6. Performance optimization (reduce unnecessary re-renders)

