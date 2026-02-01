# Multi-Duration Rounds System

## Overview

The multi-duration rounds system enables premium users to select different betting durations (5, 10, or 20 minutes) while maintaining **separate pools per duration** and a **unified UI experience**. This document explains the architecture and checkpoint schedule.

## Key Principles

### 1. Separate Pools Per Duration (Non-Negotiable)
- **5-minute bets** settle ONLY from 5-minute pools
- **10-minute bets** settle ONLY from 10-minute pools  
- **20-minute bets** settle ONLY from 20-minute pools
- Seeding is applied per market instance only
- Indecision logic is evaluated per market instance only
- **Never mix bet totals across durations for settlement**

### 2. Shared UI Aggregation (Display Only)
- `total_activity_amount` = sum of all duration pools
- `live_bettors_count` = unique users across all durations
- `heat_index` = computed from aggregated ratio (display only)
- **Aggregated metrics do NOT affect settlement logic**

### 3. One Global Master Clock
- Single 20-minute master cycle
- All durations share the same master timer
- Settlement checkpoints are based on the master clock

## Data Model

### Market Instance
Each duration has its own market instance(s) per master round:

| Duration | Instances per Cycle | Windows |
|----------|---------------------|---------|
| 5min     | 4 instances         | 20→15, 15→10, 10→5, 5→0 |
| 10min    | 2 instances         | 20→10, 10→0 |
| 20min    | 1 instance          | 20→0 |

### Database Tables

```
MarketInstance
├── id
├── masterRoundId (FK to Round)
├── durationMinutes (FIVE|TEN|TWENTY)
├── windowStartMinutes (20, 15, 10, 5)
├── windowEndMinutes (15, 10, 5, 0)
├── status (ACTIVE|FROZEN|SETTLING|SETTLED)
├── freezeAt, settleAt
├── pool totals (outerBuy, outerSell, etc.)
├── settlement results
└── seedSnapshotJson

MarketSnapshot
├── marketInstanceId (FK)
├── snapshotType (FREEZE)
├── pool totals at snapshot time
└── user counts

MarketInstanceSettlement
├── marketInstanceId (FK)
├── settlementVersion (idempotency)
└── payout details
```

## Checkpoint Schedule

The master clock runs for 20 minutes. Freeze happens 60 seconds before each settlement checkpoint.

### Timeline (minutes remaining on master clock):

| Time | Event |
|------|-------|
| 20:00 | Master cycle starts, all instances created |
| 16:00 | **FREEZE** 5min (20→15) |
| 15:00 | **SETTLE** 5min (20→15) |
| 11:00 | **FREEZE** 5min (15→10), 10min (20→10) |
| 10:00 | **SETTLE** 5min (15→10), 10min (20→10) |
| 06:00 | **FREEZE** 5min (10→5) |
| 05:00 | **SETTLE** 5min (10→5) |
| 01:00 | **FREEZE** 5min (5→0), 10min (10→0), 20min (20→0) |
| 00:00 | **SETTLE** all remaining |

### Visual Timeline

```
Master Clock: 20min ─────────────────────────────────> 0min

5min Markets:  [20→15][15→10][10→5][5→0]
                  F S    F S   F S  F S

10min Markets: [─────20→10─────][────10→0────]
                       F    S        F    S

20min Markets: [────────────20→0────────────]
                                      F    S

F = Freeze, S = Settle
```

## Bet Placement Flow

1. User selects duration (5, 10, or 20 minutes)
2. System finds the correct **active market instance** for that duration based on current master time
3. Bet is linked to that specific market instance
4. Market instance pools are updated (not master round pools)
5. UI shows aggregated totals across all durations

### Example
At 12 minutes remaining on master clock:
- 5min bet → routes to 15→10 instance
- 10min bet → routes to 20→10 instance  
- 20min bet → routes to 20→0 instance

## Settlement Algorithm

**The core algorithm is UNCHANGED:**
1. Minority wins (smallest pool wins per pair)
2. Indecision triggered if ANY layer ties (including 0-0)
3. Fixed 2x payout multiplier
4. 2% house fee from losers pool

**What changed:**
- Algorithm runs per **market instance** instead of per round
- Each instance has its own pool totals from freeze snapshot
- Settlement is idempotent via `MarketInstanceSettlement` record

## WebSocket Events

### Master Clock
```typescript
// Broadcast every second
emit('masterClockTick', {
  masterRoundId: string,
  roundNumber: number,
  masterRemainingSeconds: number,
  durationTimers: {
    five: number,   // seconds until 5min window ends
    ten: number,    // seconds until 10min window ends
    twenty: number, // seconds until 20min (master) ends
  },
  phase: 'ACTIVE' | 'FINAL_MINUTE',
  serverTime: number,
})
```

### Aggregated Stats
```typescript
// Broadcast on bet placement
emit('aggregatedStatsUpdated', {
  masterRoundId: string,
  totalActivityAmount: number,
  liveBettorsCount: number,
  heatIndex: { outer, middle, inner, overall },
  pools: { outerBuy, outerSell, ... },
  byDuration: {
    five: { amount, bets, users },
    ten: { amount, bets, users },
    twenty: { amount, bets, users },
  },
})
```

### Duration Selection
```typescript
// Client sends
emit('selectDuration', { durationMinutes: 5 | 10 | 20 })

// Client receives duration-specific events
on('myMarketStateChanged', ...)
```

## Client Timer Display

The client should display:
1. **Master timer** (optional) - shows 20-minute cycle
2. **User's timer** - based on their selected duration:
   - 5min: remaining until next quarter end (15/10/5/0)
   - 10min: remaining until next half end (10/0)
   - 20min: remaining until cycle end (0)

**Timer sync:** Use `serverTime` from `masterClockTick` to calculate offset and ensure accurate countdown.

## Seeding

Seeding prevents 0-0 pairs from triggering Indecision:
- Applied per **market instance** before freeze
- Uses deterministic rotation based on round number + window
- Removed when user bet is placed in that instance
- Locked at freeze time
- Does NOT affect other duration pools

## Migration Notes

### Database Migration
Apply the migration in `prisma/migrations/20260201000000_add_multi_duration_rounds/migration.sql`:
```bash
npx prisma migrate deploy
```

### Backward Compatibility
- Existing bets without `marketInstanceId` will continue to work
- Default duration is 20 minutes (full cycle)
- Round-level totals are still maintained for backward compatibility

## Testing Checklist

- [ ] 5min bet appears only in correct 5min market instance pools
- [ ] 10min settlement at 10:00 does not affect 20min or 5min pools
- [ ] 20min settlement at 0:00 uses only 20min pools
- [ ] Seeding triggers only inside that duration's market
- [ ] Aggregated UI totals sum all active instances
- [ ] Timer countdown is accurate for each duration
- [ ] Settlement is idempotent (no double settlement)
- [ ] Freeze snapshot captures correct pool state

## Architecture Files

| File | Purpose |
|------|---------|
| `market-instance.service.ts` | Manage market instances lifecycle |
| `master-clock.service.ts` | Global 20-min cycle management |
| `market-instance-settlement.service.ts` | Settlement per market instance |
| `market-aggregation.service.ts` | Aggregated display metrics |
| `bets.service.ts` | Bet routing to correct instance |
| `seeding.service.ts` | Per-instance seeding |
| `realtime.gateway.ts` | WebSocket events |
| `rounds-scheduler.service.ts` | Checkpoint scheduling |
