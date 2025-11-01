# Complete Backend Analysis

## 📁 Backend Structure Overview

### Modules & Services

#### 1. **Auth Module** (`auth/`)
- **Service**: `auth.service.ts` - Authentication & JWT
- **Controller**: `auth.controller.ts` - Login, Register, OTP
- **Features**:
  - JWT authentication
  - Password hashing
  - OTP service for 2FA
  - Password reset functionality

#### 2. **Users Module** (`users/`)
- **Service**: `users.service.ts`
- **Controller**: `users.controller.ts`
- **Features**:
  - User CRUD operations
  - User search (by email, username, name)
  - Ban/unban users
  - KYC approval/rejection
  - User statistics
  - Referral tracking

#### 3. **Wallet Module** (`wallet/`)
- **Service**: `wallet.service.ts`, `transactions.service.ts`
- **Controller**: `wallet.controller.ts`
- **Features**:
  - ✅ Deposit/Withdrawal (with admin approval)
  - ✅ Internal transfers (Premium only)
  - ✅ Transaction history
  - ✅ Withdrawal limits ($2k/day for regular, unlimited for premium)
  - ✅ Transfer fee calculation
  - **Missing**: Email contact for transfers

#### 4. **Rounds Module** (`rounds/`)
- **Services**:
  - `rounds.service.ts` - Round lifecycle
  - `rounds-settlement.service.ts` - Settlement algorithm
  - `rounds-scheduler.service.ts` - Auto transitions
  - `rounds-fairness.service.ts` - Cryptographic fairness
  - `bets.service.ts` - Bet placement & cancellation
  - `autospin.service.ts` - Auto-spin orders (Premium)
  - `suggestions.service.ts` - Minority rule suggestions
- **Controllers**: 
  - `rounds.controller.ts`, `bets.controller.ts`, `autospin.controller.ts`, `suggestions.controller.ts`
- **Features**:
  - ✅ Round-based betting system
  - ✅ 3-layer markets (OUTER, MIDDLE, INNER)
  - ✅ Indecision override (0-0 tie triggers)
  - ✅ Premium bet cancellation
  - ✅ Auto-spin orders (up to 50)
  - ✅ Suggestions based on first 3 orders

#### 5. **Premium Module** (`premium/`)
- **Service**: `premium.service.ts`
- **Controller**: `premium.controller.ts`
- **Features**:
  - Premium plan management
  - Subscription creation
  - Premium status tracking

#### 6. **Affiliate Module** (`affiliate/`)
- **Service**: `affiliate.service.ts`
- **Controller**: `affiliate.controller.ts`
- **Features**:
  - ✅ Referral tracking
  - ✅ Tier-based commissions (5 tiers)
  - ✅ Once-per-day payout rule
  - ✅ Affiliate stats

#### 7. **Admin Module** (`admin/`)
- **Service**: `admin.service.ts`
- **Controller**: `admin.controller.ts`
- **Features**:
  - Dashboard statistics
  - System configuration
  - User management
  - Recent activity logs
  - Internal transfer approval

#### 8. **Chat Module** (`chat/`)
- **Service**: `chat.service.ts`
- **Controller**: `chat.controller.ts`
- **Features**:
  - ✅ Basic community chat
  - ✅ Premium/verified room access
  - ✅ Rate limiting
  - ✅ Admin message deletion
  - **Note**: Simple implementation (no P2P, no pinning)

#### 9. **Preferences Module** (`preferences/`)
- **Service**: `preferences.service.ts`
- **Controller**: `preferences.controller.ts`
- **Features**:
  - ✅ Flexible spin timing (5/10/20 min for premium)
  - ✅ Auto-spin preferences
  - ✅ Notification settings

#### 10. **Spins Module** (`spins/`)
- **Service**: `spins.service.ts`
- **Controller**: `spins.controller.ts`
- **Features**: Legacy spin system (separate from rounds)

---

## 🔄 Data Flow

### Internal Transfer Flow
1. User creates transfer → `POST /wallet/transfer`
2. Finds recipient by username/ID (currently)
3. Creates `InternalTransfer` record (status: PENDING)
4. Holds funds in sender's wallet
5. Admin approves → Funds move to recipient

**Current Issue**: 
- ❌ Can't search by email
- ❌ Recipient email not returned in response
- ❌ No way to contact recipient for transfer discussion

---

## 💾 Database Models

### Core Models:
1. **User** - Profile, premium status, KYC, referrals
2. **Wallet** - Balances (available, held), totals
3. **Transaction** - All financial transactions
4. **Round** - Round-based betting system
5. **Bet** - Individual bets on rounds
6. **InternalTransfer** - User-to-user transfers
7. **AutoSpinOrder** - Auto-press orders
8. **UserPreferences** - User settings
9. **ChatMessage** - Community messages
10. **AffiliateEarning** - Referral commissions
11. **PremiumPlan/Subscription** - Premium management

---

## 🎯 Missing for Simple Transfer Contact

**Need to add**:
1. ✅ Allow searching recipient by email (not just username/ID)
2. ✅ Return recipient email in transfer response (for contact)
3. ✅ Optional: Simple endpoint to search users for transfer

---

## 📊 API Endpoints Summary

### Wallet
- `POST /wallet/deposit`
- `POST /wallet/withdraw`
- `POST /wallet/transfer` (Premium) - **Needs email support**
- `GET /wallet/transactions`
- `GET /wallet` (balance)

### Users
- `GET /users/:id` - Get user profile
- `GET /users` - List users (Admin)
- `PATCH /users/:id` - Update user

### Rounds
- `GET /rounds/current` - Current active round
- `GET /rounds/history` - Round history
- `POST /bets` - Place bet
- `POST /bets/cancel/:betId` - Cancel bet (Premium)
- `POST /autospin` - Create auto-spin order
- `GET /suggestions/current` - Get suggestions

### Chat
- `POST /chat` - Send message
- `GET /chat/:roomType` - Get messages

### Preferences
- `GET /preferences` - Get preferences
- `PUT /preferences` - Update preferences

---

## ✅ Current Status

**Working**:
- ✅ All core betting functionality
- ✅ Internal transfers (premium only)
- ✅ Premium features
- ✅ Admin dashboard
- ✅ Affiliate system
- ✅ Basic chat

**Simple Enhancement Needed**:
- 🔧 Allow email search for transfers
- 🔧 Return recipient email for contact

---

This is a solid, production-ready backend! The transfer system just needs simple email contact support.

