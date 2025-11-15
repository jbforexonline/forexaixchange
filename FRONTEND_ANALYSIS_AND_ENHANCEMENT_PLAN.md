# Frontend Analysis & Enhancement Plan

## Executive Summary

The frontend is a **Next.js 15** application with TypeScript, Tailwind CSS, and Socket.IO client. Currently, it has a **basic UI structure** with **mock data** and **no backend integration**. This document outlines the current state and provides a comprehensive plan to integrate with the backend API.

---

## 📊 Current Frontend State

### ✅ What's Already Implemented

#### **Technology Stack**
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, SCSS
- **Form Handling**: React Hook Form + Zod validation
- **Real-time**: Socket.IO Client 4.8.1
- **HTTP Client**: Axios 1.12.2
- **Icons**: Lucide React, React Icons
- **Auth**: Next-Auth (installed but not configured)

#### **Page Structure**
```
frontend/src/app/
├── page.tsx              ✅ Basic health check with Socket.IO
├── login/page.tsx        ✅ Login UI (mock, no API)
├── register/page.tsx     ✅ Register UI (mock, no API)
├── dashboard/page.tsx    ✅ Admin dashboard placeholder
├── user-dashboard/       ✅ User dashboard structure
│   ├── page.tsx
│   ├── spin/page.tsx
│   ├── deposit/page.tsx
│   └── settings/page.tsx
├── spin/page.tsx         ✅ Spin page with neural interface UI
├── deposit/page.tsx      ✅ Deposit page placeholder
├── withdraw/page.tsx     ✅ Withdraw page (form only, no API)
└── settings/page.tsx      ✅ Settings page placeholder
```

#### **Components**
- ✅ **Forms**: Login, Register, ForgetPassword (mock logic)
- ✅ **Layouts**: DashboardLayout, UserDashboardLayout
- ✅ **Dashboard Components**: SpinPage (visual only), DepositPage, WithdrawPage (UI only)
- ✅ **Styling**: SCSS files for all components

#### **Current Integration Status**
- ❌ **No Backend API Integration** (except basic health check)
- ❌ **No Authentication Flow** (login/register are mock)
- ❌ **No JWT Token Management**
- ❌ **No WebSocket Integration** (except heartbeat)
- ❌ **No Wallet Balance Display** (hardcoded values)
- ❌ **No Real-time Updates** (wallet, rounds, bets)
- ❌ **No Form Validation** (beyond basic HTML5)

---

## 🎯 Backend API Overview

### Available Backend Endpoints

#### **Authentication** (`/auth`)
- `POST /auth/register` - Register with email or phone
- `POST /auth/login` - Login with email or phone
- `GET /auth/profile` - Get current user profile (JWT required)
- `POST /auth/forgot-password` - Request OTP
- `POST /auth/reset-password` - Reset password with OTP

#### **Rounds** (`/rounds`)
- `GET /rounds/current` - Get current active round
- `GET /rounds/:roundId` - Get round details
- `GET /rounds/:roundId/totals` - Get bet totals (real-time)
- `GET /rounds/history` - Get past rounds
- `GET /rounds/:roundId/artifact` - Get fairness artifact

#### **Bets** (`/bets`)
- `POST /bets` - Place a bet
- `POST /bets/cancel/:betId` - Cancel bet (Premium only)
- `GET /bets/current-round` - Get user's bets for current round
- `GET /bets/history` - Get bet history (paginated)
- `GET /bets/stats` - Get betting statistics
- `GET /bets/round/:roundId` - Get bets for specific round

#### **Wallet** (`/wallet`)
- `GET /wallet/balance` - Get wallet balance
- `POST /wallet/deposit` - Create deposit request
- `POST /wallet/withdraw` - Create withdrawal request
- `POST /wallet/transfer` - Create internal transfer (Premium only)
- `GET /wallet/transfer/search?q=...` - Search users for transfer
- `GET /wallet/transactions` - Get transaction history

#### **AutoSpin** (`/autospin`)
- `POST /autospin` - Create auto-spin order (Premium, max 50)
- `GET /autospin` - Get user's auto-spin orders
- `DELETE /autospin/:orderId` - Cancel auto-spin order
- `GET /autospin/active/count` - Get active orders count

#### **Suggestions** (`/suggestions`)
- `GET /suggestions` - Get bet suggestions based on first 3 orders

#### **Chat** (`/chat`)
- `POST /chat` - Send message (Premium/Verified only)
- `GET /chat/:roomType` - Get messages (GENERAL, PREMIUM, ADMIN)
- `DELETE /chat/message/:messageId` - Delete message (Admin only)

#### **Preferences** (`/preferences`)
- `GET /preferences` - Get user preferences
- `PATCH /preferences` - Update preferences (round duration, auto-spin)

#### **Users** (`/users`)
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile

#### **Affiliate** (`/affiliate`)
- `GET /affiliate/stats` - Get affiliate statistics
- `GET /affiliate/referrals` - Get referral list

#### **Admin** (`/admin`)
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/activity` - Recent activity
- Various transaction/transfer approval endpoints

---

## 📡 WebSocket Events (Socket.IO)

### Events Emitted by Backend

#### **Round Events**
- `roundOpened` - New round opened
- `roundFrozen` - Round frozen (betting closed)
- `roundSettled` - Round settled with results
- `totalsUpdated` - Bet totals updated for a round

#### **Bet Events**
- `betPlaced` - New bet placed (broadcast to all)
- `betCancelled` - Bet cancelled (broadcast to all)

#### **Wallet Events**
- `walletUpdated` - Wallet balance updated (sent to user's private room: `user:${userId}`)

#### **Chat Events**
- `messageSent` - New chat message
- `messageDeleted` - Message deleted (Admin)

#### **System Events**
- `heartbeat` - Server heartbeat (every 30s)

---

## 🚀 Enhancement Plan

### Phase 1: Core Infrastructure (Priority: 🔴 Critical)

#### **1.1 API Client Setup**
**Location**: `frontend/src/lib/api.ts` (new)

```typescript
// Centralized Axios instance with:
- Base URL configuration
- JWT token injection
- Automatic token refresh
- Error handling
- Request/response interceptors
```

**Tasks**:
- [ ] Create `src/lib/api.ts` with Axios instance
- [ ] Add environment variable for backend URL (`NEXT_PUBLIC_BACKEND_URL`)
- [ ] Implement token storage (localStorage/sessionStorage)
- [ ] Add request interceptor for JWT injection
- [ ] Add response interceptor for 401 handling (auto-logout)

#### **1.2 Authentication Service**
**Location**: `frontend/src/lib/auth.ts` (new)

```typescript
// Authentication service with:
- Login/Register functions
- Token management
- User profile fetching
- Logout functionality
- Protected route checks
```

**Tasks**:
- [ ] Create `src/lib/auth.ts`
- [ ] Implement `login(email, password)` → store token
- [ ] Implement `register(dto)` → auto-login after registration
- [ ] Implement `logout()` → clear token, redirect
- [ ] Implement `getProfile()` → fetch user profile
- [ ] Implement `isAuthenticated()` → check token validity

#### **1.3 Socket.IO Service**
**Location**: `frontend/src/lib/socket.ts` (new)

```typescript
// Socket.IO client singleton with:
- Connection management
- Event listeners setup
- User-specific room joining (user:${userId})
- Automatic reconnection
- Event type definitions
```

**Tasks**:
- [ ] Create `src/lib/socket.ts`
- [ ] Implement socket connection with JWT auth
- [ ] Join user-specific room on connect
- [ ] Setup event listeners (roundOpened, totalsUpdated, walletUpdated, etc.)
- [ ] Implement reconnection logic
- [ ] Create React hooks for socket events

#### **1.4 Context Providers**
**Location**: `frontend/src/contexts/` (new directory)

**Tasks**:
- [ ] Create `AuthContext.tsx` - User authentication state
- [ ] Create `SocketContext.tsx` - Socket connection state
- [ ] Create `WalletContext.tsx` - Wallet balance state (real-time)
- [ ] Create `RoundContext.tsx` - Current round state
- [ ] Wrap app with providers in `layout.tsx`

---

### Phase 2: Authentication Integration (Priority: 🔴 Critical)

#### **2.1 Login Page Enhancement**
**Location**: `frontend/src/Components/Forms/LogIn.jsx`

**Current State**: Mock redirect based on role selection

**Enhancements**:
- [ ] Connect to `POST /auth/login`
- [ ] Add form validation (Zod schema)
- [ ] Handle login errors (invalid credentials, account banned, etc.)
- [ ] Store JWT token on success
- [ ] Fetch user profile and store in context
- [ ] Redirect based on user role (admin → `/dashboard`, user → `/user-dashboard`)
- [ ] Add loading states
- [ ] Show success/error toasts

#### **2.2 Register Page Enhancement**
**Location**: `frontend/src/Components/Forms/Register.jsx`

**Current State**: Mock registration

**Enhancements**:
- [ ] Connect to `POST /auth/register`
- [ ] Support email OR phone registration
- [ ] Add form validation
- [ ] Handle duplicate email/phone errors
- [ ] Auto-login after successful registration
- [ ] Redirect to user dashboard

#### **2.3 Protected Routes**
**Location**: `frontend/src/components/ProtectedRoute.tsx` (new)

**Tasks**:
- [ ] Create `ProtectedRoute` component
- [ ] Check authentication status
- [ ] Redirect to login if not authenticated
- [ ] Support role-based access (admin routes)
- [ ] Wrap protected pages

#### **2.4 Auth Middleware**
**Location**: `frontend/src/middleware.ts` (new)

**Tasks**:
- [ ] Create Next.js middleware for route protection
- [ ] Check JWT token on protected routes
- [ ] Redirect unauthenticated users

---

### Phase 3: Spin Page Integration (Priority: 🔴 Critical)

#### **3.1 Spin Page Core Features**
**Location**: `frontend/src/Components/Dashboard/UserDashboard/SpinPage.jsx`

**Current State**: Visual-only neural interface, no functionality

**Enhancements**:

**A. Round Display**
- [ ] Fetch current round from `GET /rounds/current`
- [ ] Display round number
- [ ] Show countdown timer (openedAt → freezeAt → settleAt)
- [ ] Display round state (OPEN, FROZEN, SETTLED)
- [ ] Subscribe to `roundOpened`, `roundFrozen`, `roundSettled` events

**B. Bet Totals (Real-time)**
- [ ] Fetch totals from `GET /rounds/:roundId/totals`
- [ ] Subscribe to `totalsUpdated` WebSocket events
- [ ] Display sentiment bars:
  - Outer: BUY vs SELL
  - Middle: BLUE vs RED
  - Inner: HIGH_VOL vs LOW_VOL
  - Global: INDECISION
- [ ] Update bars in real-time

**C. Bet Placement**
- [ ] Create bet placement UI (buttons for each selection)
- [ ] Connect to `POST /bets`
- [ ] Show bet amount input
- [ ] Validate balance before placing
- [ ] Show loading state during placement
- [ ] Display success/error messages
- [ ] Update wallet balance immediately (via WebSocket)
- [ ] Refresh totals after bet

**D. User's Current Bets**
- [ ] Fetch from `GET /bets/current-round`
- [ ] Display active bets with amount and selection
- [ ] Show cancel button (Premium only, before freeze)
- [ ] Connect cancel to `POST /bets/cancel/:betId`

**E. Round Settlement**
- [ ] Listen for `roundSettled` event
- [ ] Display settlement results:
  - Winning selections per layer
  - User's win/loss status
  - Payout amounts
- [ ] Show celebration animation for wins
- [ ] Auto-fetch next round

**F. Suggestions (Premium)**
- [ ] Fetch from `GET /suggestions` (if premium)
- [ ] Display suggested minority options
- [ ] Highlight suggestions in bet UI

---

### Phase 4: Wallet Integration (Priority: 🔴 Critical)

#### **4.1 Wallet Balance Display**
**Location**: Multiple components (Dashboard, Spin Page, Layout)

**Tasks**:
- [ ] Fetch balance from `GET /wallet/balance`
- [ ] Subscribe to `walletUpdated` WebSocket events
- [ ] Display in header/navbar (available, held, total)
- [ ] Update in real-time across all pages
- [ ] Create `WalletContext` for global state

#### **4.2 Deposit Page**
**Location**: `frontend/src/Components/Dashboard/UserDashboard/DepositPage.jsx`

**Current State**: Placeholder only

**Enhancements**:
- [ ] Create deposit form with:
  - Amount input
  - Method selection (MTN Mobile Money, Crypto, Bank)
  - Reference/transaction ID (for crypto/bank)
- [ ] Connect to `POST /wallet/deposit`
- [ ] Handle instant deposits (MTN) vs pending (others)
- [ ] Show success message with transaction ID
- [ ] Display pending deposits list
- [ ] Real-time balance update after MTN deposit

#### **4.3 Withdraw Page**
**Location**: `frontend/src/Components/Dashboard/WithdrawPage.jsx`

**Current State**: Form UI only, hardcoded balance

**Enhancements**:
- [ ] Fetch real wallet balance
- [ ] Connect form to `POST /wallet/withdraw`
- [ ] Add withdrawal method selection
- [ ] Add withdrawal details (bank account, mobile money number, etc.)
- [ ] Show withdrawal limits ($2000/day for regular, unlimited for premium)
- [ ] Display pending withdrawals with status
- [ ] Show withdrawal history
- [ ] Show fees calculation

#### **4.4 Internal Transfer (Premium)**
**Location**: New page or tab in wallet section

**Enhancements**:
- [ ] Create transfer form:
  - Recipient search (username/email) → `GET /wallet/transfer/search`
  - Amount input
  - Fee payer selection (Sender/Recipient)
  - Confirmation checkbox
- [ ] Connect to `POST /wallet/transfer`
- [ ] Display recipient email for contact
- [ ] Show pending transfers (awaiting admin approval)
- [ ] Display transfer history
- [ ] Real-time balance updates

#### **4.5 Transaction History**
**Location**: New page or tab

**Enhancements**:
- [ ] Fetch from `GET /wallet/transactions` (paginated)
- [ ] Filter by type (DEPOSIT, WITHDRAWAL, TRANSFER, REFUND, etc.)
- [ ] Display transaction list with:
  - Date/time
  - Type and status
  - Amount
  - Description
- [ ] Add pagination

---

### Phase 5: Premium Features (Priority: 🟡 High)

#### **5.1 AutoSpin**
**Location**: New component or section in Spin page

**Enhancements**:
- [ ] Create AutoSpin form:
  - Market and selection
  - Amount per spin
  - Number of spins (max 50)
- [ ] Connect to `POST /autospin`
- [ ] Display active auto-spin orders
- [ ] Show count of active orders
- [ ] Cancel button → `DELETE /autospin/:orderId`
- [ ] Process indicator when spins are executing

#### **5.2 Cancel Bets**
**Location**: Spin Page (bet list)

**Enhancements**:
- [ ] Show cancel button on active bets (Premium only)
- [ ] Only before freeze time
- [ ] Connect to `POST /bets/cancel/:betId`
- [ ] Refresh bet list and totals after cancel
- [ ] Show refund confirmation

#### **5.3 Flexible Spin Timing**
**Location**: Settings page

**Enhancements**:
- [ ] Connect to `GET /preferences` and `PATCH /preferences`
- [ ] Allow selection of preferred round duration (5/10/20 min)
- [ ] Save preference
- [ ] Display current preference

---

### Phase 6: Community Features (Priority: 🟡 High)

#### **6.1 Chatroom**
**Location**: New page `/chat` or sidebar component

**Enhancements**:
- [ ] Create chat UI with:
  - Room selection (GENERAL, PREMIUM, ADMIN)
  - Message list (scrollable)
  - Message input
  - Send button
- [ ] Connect to `GET /chat/:roomType` for message history
- [ ] Connect to `POST /chat` for sending
- [ ] Subscribe to `messageSent` WebSocket events
- [ ] Show user info (username, premium badge, verified badge)
- [ ] Auto-scroll to bottom on new messages
- [ ] Rate limiting indicator
- [ ] Access control (Premium/Verified only for PREMIUM room)
- [ ] Admin delete button (for admins)

---

### Phase 7: User Dashboard (Priority: 🟡 High)

#### **7.1 Dashboard Home**
**Location**: `frontend/src/Components/Dashboard/UserDashboard/UserDashboard.jsx`

**Current State**: Placeholder text only

**Enhancements**:
- [ ] Display user stats:
  - Total bets, wins, losses
  - Win rate
  - Total wagered, won, profit/loss
- [ ] Fetch from `GET /bets/stats`
- [ ] Display recent bets (last 5)
- [ ] Display wallet balance summary
- [ ] Show premium status and badge
- [ ] Affiliate stats (if applicable)

#### **7.2 Settings Page**
**Location**: `frontend/src/Components/Dashboard/UserDashboard/SettingsPage.jsx`

**Enhancements**:
- [ ] Display user profile (from `GET /users/me`)
- [ ] Edit profile form → `PATCH /users/me`
- [ ] Change password (if backend supports)
- [ ] Preferences section (round duration, auto-spin settings)
- [ ] Premium subscription status
- [ ] Affiliate link display

---

### Phase 8: Admin Dashboard (Priority: 🟢 Medium)

#### **8.1 Admin Dashboard**
**Location**: `frontend/src/Components/Dashboard/DashboardHome.jsx`

**Enhancements**:
- [ ] Fetch dashboard stats from `GET /admin/dashboard`
- [ ] Display metrics:
  - Total users
  - Active rounds
  - Total deposits/withdrawals
  - Pending approvals
- [ ] Recent activity from `GET /admin/activity`
- [ ] Transaction management (approve/reject)
- [ ] User management (view, block, edit)

---

### Phase 9: Real-time Updates & UX (Priority: 🟡 High)

#### **9.1 Real-time Wallet Updates**
- [ ] Listen to `walletUpdated` events
- [ ] Update balance in header/navbar
- [ ] Show balance change notifications (toast)
- [ ] Animate balance changes

#### **9.2 Round Countdown Timer**
- [ ] Real-time countdown (freezeAt, settleAt)
- [ ] Visual warning when approaching freeze
- [ ] Disable bet buttons during FROZEN/SETTLED
- [ ] Auto-refresh when round changes

#### **9.3 Loading States**
- [ ] Add loading spinners for all API calls
- [ ] Skeleton loaders for data fetching
- [ ] Disable buttons during submission

#### **9.4 Error Handling**
- [ ] Toast notifications for errors
- [ ] Handle network errors gracefully
- [ ] Retry logic for failed requests
- [ ] 401 errors → auto-logout

#### **9.5 Success Messages**
- [ ] Toast notifications for successful actions
- [ ] Confirmation modals for critical actions (withdraw, transfer)

---

### Phase 10: Polish & Optimization (Priority: 🟢 Medium)

#### **10.1 UI/UX Enhancements**
- [ ] Responsive design (mobile-first)
- [ ] Dark mode toggle (persist preference)
- [ ] Smooth animations/transitions
- [ ] Loading skeletons
- [ ] Empty states (no bets, no transactions)
- [ ] Error boundaries

#### **10.2 Performance**
- [ ] Code splitting for routes
- [ ] Lazy loading for heavy components
- [ ] Optimize images
- [ ] Memoization for expensive computations

#### **10.3 Accessibility**
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader support

---

## 📁 Recommended File Structure

```
frontend/src/
├── app/                          # Next.js pages (existing)
├── Components/                   # UI components (existing)
│   └── [enhance existing]
├── lib/                          # NEW - Utility libraries
│   ├── api.ts                    # Axios instance
│   ├── auth.ts                   # Auth service
│   └── socket.ts                 # Socket.IO client
├── contexts/                     # NEW - React contexts
│   ├── AuthContext.tsx
│   ├── SocketContext.tsx
│   ├── WalletContext.tsx
│   └── RoundContext.tsx
├── hooks/                        # NEW - Custom React hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   ├── useWallet.ts
│   ├── useRound.ts
│   └── useBets.ts
├── types/                        # NEW - TypeScript types
│   ├── api.ts                    # API response types
│   ├── socket.ts                 # Socket event types
│   └── user.ts                   # User types
├── components/                   # NEW - Reusable components
│   ├── ProtectedRoute.tsx
│   ├── LoadingSpinner.tsx
│   ├── Toast.tsx
│   ├── CountdownTimer.tsx
│   └── BetButton.tsx
└── utils/                        # NEW - Utility functions
    ├── formatCurrency.ts
    ├── formatDate.ts
    └── validators.ts
```

---

## 🔧 Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=ForexAIExchange
```

---

## 📦 Additional Dependencies Needed

```json
{
  "dependencies": {
    "react-hot-toast": "^2.4.1",        // Toast notifications
    "date-fns": "^3.6.0",                // Date formatting
    "zustand": "^4.5.0"                  // Optional: Lightweight state management
  }
}
```

---

## 🎯 Implementation Priority

### **Sprint 1 (Week 1)**: Core Infrastructure
- API client setup
- Authentication integration
- Socket.IO service
- Context providers

### **Sprint 2 (Week 2)**: Spin Page
- Round display and countdown
- Bet placement
- Real-time totals
- Bet history

### **Sprint 3 (Week 3)**: Wallet Management
- Balance display
- Deposit/Withdraw integration
- Transaction history
- Internal transfers (Premium)

### **Sprint 4 (Week 4)**: Premium Features & Polish
- AutoSpin
- Cancel bets
- Chatroom
- Settings
- UX improvements

---

## ✅ Testing Checklist

### **Authentication**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error handling)
- [ ] Register new user
- [ ] Protected routes redirect to login
- [ ] Token persists on page refresh
- [ ] Logout clears token

### **Spin Page**
- [ ] Current round displays correctly
- [ ] Countdown timer works
- [ ] Bet totals update in real-time
- [ ] Bet placement works
- [ ] Balance updates after bet
- [ ] Round settlement displays results
- [ ] Premium features only for premium users

### **Wallet**
- [ ] Balance displays correctly
- [ ] Deposit (MTN instant, others pending)
- [ ] Withdrawal request
- [ ] Transaction history
- [ ] Internal transfer (Premium only)
- [ ] Real-time balance updates

### **Real-time**
- [ ] Socket.IO connects on login
- [ ] Wallet updates in real-time
- [ ] Round events (opened, frozen, settled)
- [ ] Totals update in real-time
- [ ] Chat messages appear instantly

---

## 📝 Notes

1. **Backend URL**: Ensure `NEXT_PUBLIC_BACKEND_URL` is set correctly for development and production.

2. **JWT Storage**: Consider using `httpOnly` cookies for production (requires backend changes) or `localStorage` with XSS protection.

3. **Socket.IO Auth**: Backend expects JWT in Socket.IO handshake. Pass token when connecting.

4. **Error Handling**: Implement consistent error handling across all API calls.

5. **Loading States**: Always show loading indicators for async operations.

6. **Real-time Updates**: Prefer WebSocket events over polling for real-time data.

---

## 🚀 Quick Start Implementation Order

1. **Phase 1** - Set up API client and auth service
2. **Phase 2** - Integrate login/register
3. **Phase 3** - Connect Spin page to backend
4. **Phase 4** - Integrate wallet operations
5. **Phase 5-10** - Premium features and polish

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Next Review**: After Sprint 1 completion

