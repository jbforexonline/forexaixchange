# Finance System Overview

## Introduction

ForexAiXchange uses a **ledger-based, admin-controlled finance system** designed for maximum security, auditability, and regulatory compliance. This document describes the architecture, workflows, and operational procedures.

## Core Principles

1. **No Peer-to-Peer Transfers**: Internal user-to-user transfers are permanently disabled
2. **Ledger-Based Accounting**: All balance changes go through append-only ledger entries
3. **Double-Entry Bookkeeping**: Every debit has a matching credit (balance integrity)
4. **Admin Approval Required**: All deposits and withdrawals require admin review
5. **Complete Audit Trail**: Every action is logged with who/what/when/why
6. **Reserve Ratio Protection**: Withdrawal restrictions when reserve ratio drops

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FINANCE SYSTEM v2                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   DEPOSITS  │    │ WITHDRAWALS │    │  SETTLEMENT │        │
│  │   PENDING   │───▶│   + OTP     │───▶│   PAYOUTS   │        │
│  │   APPROVAL  │    │   APPROVAL  │    │             │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │              LEDGER SERVICE (Double-Entry)          │      │
│  │  ┌─────────────────────────────────────────────┐   │      │
│  │  │           LEDGER ENTRIES (Append-Only)      │   │      │
│  │  └─────────────────────────────────────────────┘   │      │
│  └─────────────────────────────────────────────────────┘      │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                 LEDGER ACCOUNTS                     │      │
│  ├─────────────────────────────────────────────────────┤      │
│  │ USER_AVAILABLE │ USER_HELD │ HOUSE_PROFIT │ RESERVE │      │
│  │ FEE_COLLECTION │ CLEARING  │ OPERATING_CAPITAL      │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Deposit Workflow

```
Status Flow: PENDING → APPROVED → CREDITED (or REJECTED)

1. User creates deposit request (amount, method, reference)
2. Deposit created with status: PENDING
3. Admin reviews deposit proof/reference
4. Admin approves → status: APPROVED → ledger entry → status: CREDITED
   OR Admin rejects → status: REJECTED (with reason)
```

### API Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/finance/deposits` | Create deposit request | User |
| GET | `/finance/deposits` | List my deposits | User |
| GET | `/admin/finance/deposits` | List all deposits | Admin |
| GET | `/admin/finance/deposits/pending` | Pending deposits | Admin |
| POST | `/admin/finance/deposits/:id/approve` | Approve deposit | Finance Admin |
| POST | `/admin/finance/deposits/:id/reject` | Reject deposit | Finance Admin |

## Withdrawal Workflow

```
Status Flow: DRAFT → CONFIRMED → PENDING_REVIEW → APPROVED → PAID
             (or REJECTED → REFUNDED)

1. User creates withdrawal request (amount, method, destination)
2. OTP sent to user's email/phone
3. User confirms with OTP → funds HELD from available
4. Admin reviews withdrawal request
5. Admin approves → status: APPROVED
6. Admin marks as PAID after external payout → funds permanently debited
   OR Admin rejects → funds RELEASED back to available
```

### API Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/finance/withdrawals` | Create withdrawal (DRAFT) | User |
| POST | `/finance/withdrawals/:id/confirm` | Confirm with OTP | User |
| POST | `/finance/withdrawals/:id/resend-otp` | Resend OTP | User |
| DELETE | `/finance/withdrawals/:id` | Cancel (DRAFT only) | User |
| GET | `/finance/withdrawals` | List my withdrawals | User |
| GET | `/admin/finance/withdrawals` | List all withdrawals | Admin |
| GET | `/admin/finance/withdrawals/pending` | Pending review | Admin |
| POST | `/admin/finance/withdrawals/:id/approve` | Approve withdrawal | Finance Admin |
| POST | `/admin/finance/withdrawals/:id/reject` | Reject & refund | Finance Admin |
| POST | `/admin/finance/withdrawals/:id/pay` | Mark as paid | Finance Admin |

## House / System Accounts

The system maintains several internal accounts for tracking platform finances:

| Account | Purpose |
|---------|---------|
| `HOUSE_PROFIT` | Accumulates profits from round settlements |
| `RESERVE_FUND` | Must be ≥ 120% of total user liabilities |
| `OPERATING_CAPITAL` | Platform operating expenses |
| `CLEARING` | Settlement clearing account |
| `FEE_COLLECTION` | Collected fees from withdrawals |

## Reserve Ratio Monitoring

The reserve ratio protects user funds by ensuring the platform has sufficient reserves:

```
Reserve Ratio = Bank Balance / Total User Liabilities

Thresholds:
- HEALTHY:  ratio ≥ 1.2 (120%)
- WARNING:  ratio < 1.2 (120%) - Large withdrawals paused
- CRITICAL: ratio < 1.1 (110%) - All withdrawals locked
```

### API Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/admin/finance/house` | House account balances | Finance Admin |
| GET | `/admin/finance/reserve` | Reserve ratio status | Finance Admin |
| POST | `/admin/finance/reserve/update` | Update bank balance | Finance Admin |
| GET | `/admin/finance/reserve/snapshots` | Bank snapshot history | Finance Admin |

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `FINANCE_ADMIN` | Approve deposits/withdrawals, view reserve ratio |
| `SYSTEM_ADMIN` | Configure thresholds/fees, view dashboards |
| `AUDIT_ADMIN` | Read-only access to everything, cannot change outcomes |
| `SUPER_ADMIN` | All permissions |

**Important**: No role can modify ledger history or change round outcomes.

## Round Settlement

Round settlement is idempotent - rerunning settlement for the same round will not cause double payments.

```
Settlement Process:
1. Check idempotency (RoundSettlement record)
2. Compute winners/losers using minority rule
3. Create ledger entries for payouts
4. Update user balances via ledger
5. Create RoundSettlement record
6. Record house profit in HOUSE_PROFIT account
```

## Configuration

Environment variables for the finance system:

```env
# Feature Flags
TRANSFERS_ENABLED=false  # Must remain false in production

# Reserve Ratio Thresholds
RESERVE_RATIO_MIN=1.1
RESERVE_RATIO_WARNING=1.2

# Withdrawal Limits (USD)
FREE_DAILY_WITHDRAWAL_LIMIT=500
PREMIUM_DAILY_WITHDRAWAL_LIMIT=10000
LARGE_WITHDRAWAL_THRESHOLD=1000

# Fees
WITHDRAWAL_FEE_PERCENT=2
DEPOSIT_FEE_PERCENT=0

# OTP
OTP_EXPIRATION_SECONDS=300
```

## Database Migrations

To apply the new schema changes:

```bash
cd backend

# Generate migration
npx prisma migrate dev --name finance_system_v2

# Apply migration to production
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

## Testing

Run finance system tests:

```bash
cd backend

# Unit tests
npm run test -- --grep "finance"

# Integration tests
npm run test:e2e -- --grep "finance"
```

### Test Coverage

- Fee calculation (round up)
- Reserve ratio logic
- Payout rounding (round down)
- Deposit approval workflow
- Withdrawal OTP + approval workflow
- Settlement idempotency
- Role-based access control

## Security Considerations

1. **No direct balance updates**: All changes via ledger
2. **Idempotency keys**: Prevent duplicate transactions
3. **OTP verification**: Required for withdrawals
4. **Admin approval**: Required for deposits and withdrawals
5. **Audit logging**: All admin actions recorded
6. **Reserve protection**: Automatic withdrawal locks
7. **Role separation**: Finance/System/Audit admins have different permissions

## Alerting

The system generates alerts for:

- `RESERVE_RATIO_CRITICAL`: Reserve below minimum, withdrawals locked
- `RESERVE_RATIO_WARNING`: Reserve below warning threshold
- `LARGE_WITHDRAWAL`: Withdrawal above threshold requires extra review

View and acknowledge alerts via:
- `GET /admin/finance/alerts`
- `POST /admin/finance/alerts/:id/acknowledge`

## Troubleshooting

### Ledger Integrity Check

```typescript
// Verify ledger balances equal (double-entry)
const result = await ledgerService.verifyLedgerIntegrity();
console.log(result.isValid); // Should be true
```

### Common Issues

1. **Withdrawal stuck in PENDING_REVIEW**: Check admin dashboard
2. **Deposit not credited**: Verify admin approved and check ledger entries
3. **Reserve ratio critical**: Update bank balance via admin dashboard
4. **OTP expired**: User can request new OTP via resend endpoint
