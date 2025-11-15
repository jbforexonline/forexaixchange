# Forex Theme UI Implementation Plan
## Complete Gap Analysis & Backend Integration Roadmap

---

## 📊 Executive Summary

**Current State**: Frontend has basic UI components with **mock data** and **no backend integration**. The provided `SpinWheel.jsx` component is **not yet integrated** into the codebase.

**Target State**: Full forex-themed trading platform UI with complete backend integration matching the Dashboard Draft requirements.

**Gap**: 95% of functionality needs implementation. Core infrastructure and all feature integrations are missing.

---

## 🎯 Critical Components Status

### ✅ **What Exists (UI Only)**
- Basic Next.js 15 structure with TypeScript
- Login/Register form components (no API)
- Dashboard layout structures
- SpinPage with neural interface visuals (different from SpinWheel)
- Wallet pages (deposit/withdraw forms, no API)
- Styling (SCSS files, basic Tailwind)

### ❌ **What's Missing (Everything Else)**
- `SpinWheel.jsx` component (provided but not integrated)
- All backend API integrations
- Real-time WebSocket connections
- Authentication flow with JWT
- State management (Context/Store)
- Forex-themed UI components
- Community sentiment bars
- Bet placement UI
- Wallet balance display
- Admin dashboard features
- And 100+ other features...

---

## 📋 Dashboard Draft Requirements vs Current Implementation

### 🔹 **User Dashboard Requirements**

#### **1. Header Components**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Wallet balance quick view (Real + Demo) | ❌ Hardcoded | `GET /wallet/balance` | Create `WalletBalance.tsx`, subscribe to `walletUpdated` events |
| Deposit / Withdraw quick buttons | ✅ UI exists | `POST /wallet/deposit`, `POST /wallet/withdraw` | Connect forms to APIs |
| Notifications bell | ❌ Missing | WebSocket `notification` events | Create `NotificationBell.tsx` component |
| Language selector | ❌ Missing | Client-side only | Create `LanguageSelector.tsx` |
| Server time (GMT) with date | ❌ Missing | Client-side (moment.js/dayjs) | Create `ServerTime.tsx` |
| Profile access | ✅ Link exists | `GET /users/me` | Fetch user profile, create dropdown |

#### **2. Spin Center (Core Feature)**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| **SpinWheel Component** | ❌ **Not integrated** | Multiple APIs | **Critical**: Add `SpinWheel.jsx` to codebase |
| Assets display (Forex, Indices, etc.) | ❌ Missing | Display currencies from props | Pass `currencies` prop from backend |
| Volatility modes (High/Low) | ✅ In SpinWheel | `GET /rounds/current/totals` | Connect to totals API |
| Buy/Sell color coding | ✅ In SpinWheel | Real-time totals | Subscribe to `totalsUpdated` events |
| Blue/Red coding | ✅ In SpinWheel | Real-time totals | Same as above |
| **Payout multipliers (x2)** | ❌ Missing | Display in UI | Add payout labels to SpinWheel |
| **Countdown timer in center** | ✅ In SpinWheel | `GET /rounds/current` | Calculate from `freezeAt`, `settleAt` |
| Auto-spin / Auto-press (Premium) | ❌ Missing | `POST /autospin` | Create `AutoSpinPanel.tsx` |
| Crypto spin mode | ❌ Missing | Future feature | Placeholder for now |
| **Bet placement UI** | ❌ Missing | `POST /bets` | Create bet buttons around wheel |
| **Real-time totals** | ❌ Missing | WebSocket `totalsUpdated` | Subscribe and update wheel bars |

**🚨 Critical Missing:**
- The `SpinWheel.jsx` component needs to be added to `frontend/src/components/SpinWheel.tsx`
- Bet placement buttons (BUY, SELL, BLUE, RED, HIGH, LOW, INDECISION) need to wrap around or overlay the wheel
- Real-time totals need to update the visual representation (could add gradient fills or bar overlays)

#### **3. Community Sentiment "Power Bars"**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Buyers vs Sellers bars | ❌ Missing | `GET /rounds/:id/totals` | Create `SentimentBars.tsx` |
| High vs Low Volatile bars | ❌ Missing | Same API | Same component |
| Blue vs Red bars | ❌ Missing | Same API | Same component |
| Real-time updates | ❌ Missing | WebSocket `totalsUpdated` | Subscribe in component |

**Implementation**: Create a `CommunitySentiment.tsx` component with three horizontal bar pairs showing percentages.

#### **4. Wallet & Account**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Real wallet + Demo wallet | ❌ Missing | `GET /wallet/balance` | Separate display (demo not implemented in backend yet) |
| Deposit / Withdraw buttons | ✅ Forms exist | `POST /wallet/deposit`, `POST /wallet/withdraw` | Connect forms |
| Transaction tracking | ❌ Missing | `GET /wallet/transactions` | Create `TransactionHistory.tsx` |
| Pending/Completed/Rejected status | ❌ Missing | Filter transactions by status | Add status filters |

#### **5. Live Account Status**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Status display (Enabled/Disabled) | ❌ Missing | `GET /users/me` (check flag) | Create `LiveAccountStatus.tsx` |
| Disabled message with countdown | ❌ Missing | Backend config | Display message when disabled |

#### **6. Demo Wallet & Practice Mode**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Demo wallet balance | ❌ Missing | Not in backend yet | **Future**: Backend needs demo wallet support |
| Practice mode | ❌ Missing | Same | **Future feature** |
| Reset demo balance | ❌ Missing | Not in backend | **Future feature** |

#### **7. History & AI Suggestions**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Last history result | ❌ Missing | `GET /rounds/history?limit=1` | Create `LastRoundResult.tsx` |
| Full history of spins | ❌ Missing | `GET /rounds/history` | Create `RoundHistory.tsx` with filters |
| AI suggestion for next spin | ❌ Missing | `GET /suggestions` | Create `AISuggestionPanel.tsx` |

#### **8. Affiliate Board**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Referral link & stats | ❌ Missing | `GET /affiliate/stats` | Create `AffiliateBoard.tsx` |
| Commission tiers display | ❌ Missing | Same API | Show tier table in component |
| Once-per-day rule display | ❌ Missing | Same API | Show countdown timer |
| Progress chart | ❌ Missing | `GET /affiliate/referrals` | Create chart component |

#### **9. Verification Badge**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Badge display | ❌ Missing | `GET /users/me` (check `verificationBadge`) | Show badge in header/profile |
| Unlocks chart room | ❌ Missing | Access control in chat | Check badge in chat component |

#### **10. Premium Package Features**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Cancel/adjust orders | ❌ Missing | `POST /bets/cancel/:betId` | Add cancel button to bet list |
| Auto-spin / auto-press | ❌ Missing | `POST /autospin` | Create `AutoSpinPanel.tsx` |
| Member chart room access | ❌ Missing | `POST /chat`, `GET /chat/:roomType` | Create `ChatRoom.tsx` |
| Higher limits display | ❌ Missing | Check premium status | Show limit badges |

#### **11. Order Locking Rules**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Free users: Locked until game ends | ❌ Missing | Check round state + user premium | Disable buttons during FROZEN |
| Premium: Cancel before game ends | ❌ Missing | Same + premium check | Enable cancel button |

#### **12. Member Chart Room**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Premium/Verified access | ❌ Missing | Check user role/badge | Access control in component |
| Live chat | ❌ Missing | `POST /chat`, WebSocket `messageSent` | Create `ChatRoom.tsx` |
| Chart sharing | ❌ Missing | Future feature | Placeholder |

#### **13. Community Stats**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| 10,000+ registered users | ❌ Missing | `GET /admin/dashboard` or stats endpoint | Display in footer/sidebar |
| Spins today | ❌ Missing | Same API | Same |
| Biggest win this week | ❌ Missing | Leaderboard API | Create `Leaderboard.tsx` |
| Currently online | ❌ Missing | WebSocket connection count | Display in header |

#### **14. Activity & Leaderboards**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Top wins (day/week/month/year/all-time) | ❌ Missing | `GET /leaderboards` (if exists) or calculate from rounds | Create `LeaderboardPage.tsx` |
| Trending users | ❌ Missing | Same | Same component |

#### **15. Achievements**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Daily/weekly goals | ❌ Missing | Not in backend yet | **Future feature** |
| Hidden unlocks | ❌ Missing | Not in backend | **Future feature** |

#### **16. Notifications**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Updates, promos, notices | ❌ Missing | WebSocket `notification` events | Create `NotificationSystem.tsx` |
| Bell icon with count | ❌ Missing | Same | Same component |

#### **17. Profile & Settings**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Personal info | ❌ Missing | `GET /users/me`, `PATCH /users/me` | Enhance `SettingsPage.tsx` |
| 2FA | ❌ Missing | Not in backend | **Future feature** |
| Reset demo balance | ❌ Missing | Not in backend | **Future feature** |

---

### 🔹 **Admin Dashboard Requirements**

#### **1. Header & Quick Controls**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Account balance quick view | ❌ Missing | `GET /wallet/balance` (admin's own) | Display in header |
| Deposit / Withdraw quick buttons | ✅ Forms exist | Same as user | Connect to APIs |
| Notifications bell | ❌ Missing | Same as user | Same component |
| Language selector | ❌ Missing | Client-side | Same component |
| Server time (GMT) | ❌ Missing | Client-side | Same component |
| Register / Login buttons | ✅ Exists | Same as user | Already done |

#### **2. Overview / Analytics Panel**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Total users (real count) | ❌ Missing | `GET /admin/dashboard` | Fetch and display |
| Total transactions | ❌ Missing | Same API | Same |
| Revenue summary | ❌ Missing | Same API | Same |
| Active users online | ❌ Missing | WebSocket connections | Display connection count |
| Daily/weekly/monthly visitors | ❌ Missing | Analytics endpoint | Create charts |

#### **3. User Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| View/search/edit/block users | ❌ Missing | `GET /users`, `PATCH /users/:id` | Create `UserManagementPage.tsx` |
| Monitor activity | ❌ Missing | `GET /admin/activity` | Display activity feed |

#### **4. Transaction Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| View all deposits/withdrawals | ❌ Missing | `GET /wallet/admin/transactions` | Create `TransactionManagementPage.tsx` |
| Track pending/approved/rejected | ❌ Missing | Same API with filters | Add status filters |
| Export history | ❌ Missing | Download CSV/Excel | Add export button |

#### **5. Reports & Analytics**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Graphs/charts for trends | ❌ Missing | Multiple endpoints | Create `AnalyticsDashboard.tsx` with charts |
| Downloadable reports | ❌ Missing | Export endpoints | Add export functionality |

#### **6. Affiliate Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Track all affiliates | ❌ Missing | `GET /admin/affiliates` | Create `AffiliateManagementPage.tsx` |
| Commission per referral per day | ❌ Missing | Same API | Display commission table |
| Once-per-day rule per referral | ❌ Missing | Same API | Show rule status |
| Daily commission logs | ❌ Missing | Same API | Display logs table |
| Override options | ❌ Missing | `POST /admin/affiliates/override` | Add override buttons |
| Affiliate leaderboard & stats | ❌ Missing | Same API | Create leaderboard component |

#### **7. Demo & Live Account Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Toggle Live Accounts ON/OFF | ❌ Missing | `POST /admin/config/liveAccounts` | Create toggle component |
| Schedule disablement | ❌ Missing | Same API | Add scheduling UI |
| Monitor demo usage | ❌ Missing | Analytics | Display demo stats |

#### **8. Spin Game Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Asset categories | ❌ Missing | Config API | Create `GameSettingsPage.tsx` |
| Volatility modes | ❌ Missing | Same | Same page |
| Buy/Sell coding | ✅ In SpinWheel | Already working | No change needed |
| Blue/Red coding | ✅ In SpinWheel | Already working | No change needed |
| Payout multipliers | ❌ Missing | Config API | Display and edit in settings |
| Auto-spin scheduling | ❌ Missing | Backend scheduler | Display schedule |
| Weekend spin toggle | ❌ Missing | Config API | Add toggle |
| Crypto spin mode | ❌ Missing | Future feature | Placeholder |

#### **9. Market Info & Utilities**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Forex/market watchlist | ❌ Missing | External API (not in backend) | Integrate forex API |
| Global/FX news feed | ❌ Missing | External API | Integrate news API |
| Currency pair live ticker | ❌ Missing | External API | Create ticker component |
| Currency converter | ❌ Missing | External API or calculation | Create converter component |

#### **10. Verification Badge Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Auto badge for premium | ❌ Missing | Auto in backend | Display in user list |
| Auto badge for $1000+/week | ❌ Missing | Auto in backend | Display in user list |
| Approve/revoke manually | ❌ Missing | `PATCH /users/:id` | Add badge toggle in user management |

#### **11. Premium User Management**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Track premium subscriptions | ❌ Missing | `GET /users?premium=true` | Filter users by premium |
| Manage perks | ❌ Missing | `PATCH /users/:id` | Edit user premium status |

#### **12. Member Chart Room Monitoring**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| View live chat feed | ❌ Missing | `GET /chat/:roomType` | Display chat in admin panel |
| Moderate discussions | ❌ Missing | `DELETE /chat/message/:id` | Add delete button for admins |

#### **13. Activity & Leaderboards**

| Requirement | Current State | Backend API | Implementation Needed |
|------------|--------------|-------------|----------------------|
| Highest win of day/week/month/year | ❌ Missing | Calculate from rounds | Create leaderboard |
| Highest win of all-time | ❌ Missing | Same | Same component |
| Top users leaderboard | ❌ Missing | `GET /leaderboards` | Display leaderboard |

---

## 🚀 Implementation Roadmap

### **Phase 1: Core Infrastructure & SpinWheel Integration (Week 1)**
**Priority: 🔴 CRITICAL**

#### **1.1 Add SpinWheel Component**
```bash
# Create file: frontend/src/components/SpinWheel.tsx
# Copy the provided SpinWheel.jsx code
# Convert to TypeScript if needed
```

#### **1.2 API Client Setup**
- [ ] Create `frontend/src/lib/api.ts` with Axios instance
- [ ] Add JWT token injection
- [ ] Add error handling
- [ ] Add environment variables

#### **1.3 Authentication Service**
- [ ] Create `frontend/src/lib/auth.ts`
- [ ] Implement login/register/logout
- [ ] JWT token storage
- [ ] Protected route wrapper

#### **1.4 Socket.IO Service**
- [ ] Create `frontend/src/lib/socket.ts`
- [ ] Connect to backend with JWT
- [ ] Join user room: `user:${userId}`
- [ ] Event listeners for all events

#### **1.5 Context Providers**
- [ ] Create `AuthContext.tsx`
- [ ] Create `SocketContext.tsx`
- [ ] Create `WalletContext.tsx`
- [ ] Create `RoundContext.tsx`
- [ ] Wrap app in `layout.tsx`

---

### **Phase 2: Spin Page Complete Integration (Week 2)**
**Priority: 🔴 CRITICAL**

#### **2.1 Replace Current SpinPage with SpinWheel**
- [ ] Remove old `SpinPage.jsx` neural interface
- [ ] Create `SpinPage.tsx` that uses `SpinWheel` component
- [ ] Fetch current round: `GET /rounds/current`
- [ ] Calculate countdown from `freezeAt`, `settleAt`
- [ ] Pass props to SpinWheel

#### **2.2 Real-time Totals Integration**
- [ ] Fetch initial totals: `GET /rounds/:id/totals`
- [ ] Subscribe to `totalsUpdated` WebSocket events
- [ ] Update visual representation (could enhance SpinWheel to show bar overlays)
- [ ] Create `SentimentBars.tsx` component for "Power Bars"

#### **2.3 Bet Placement UI**
- [ ] Create bet buttons around SpinWheel:
  - BUY / SELL (outer ring)
  - BLUE / RED (middle ring)
  - HIGH / LOW (inner ring)
  - INDECISION (special button)
- [ ] Add amount input
- [ ] Connect to `POST /bets`
- [ ] Show loading/success/error states
- [ ] Update wallet balance immediately

#### **2.4 User's Current Bets Display**
- [ ] Fetch: `GET /bets/current-round`
- [ ] Display bets list below wheel
- [ ] Add cancel button (Premium only, before freeze)
- [ ] Connect cancel to `POST /bets/cancel/:betId`

#### **2.5 Round Settlement**
- [ ] Subscribe to `roundSettled` WebSocket event
- [ ] Pass `winners` prop to SpinWheel
- [ ] Show celebration animation
- [ ] Display payout amounts
- [ ] Auto-fetch next round

#### **2.6 Countdown Timer**
- [ ] Calculate from current time vs `freezeAt`/`settleAt`
- [ ] Update every second
- [ ] Show warnings at 60s, 30s, 10s
- [ ] Disable bet buttons during FROZEN/SETTLED

---

### **Phase 3: Header & Navigation (Week 2-3)**
**Priority: 🔴 CRITICAL**

#### **3.1 Wallet Balance Display**
- [ ] Fetch: `GET /wallet/balance`
- [ ] Subscribe to `walletUpdated` events
- [ ] Display in header (available, held, total)
- [ ] Format as currency
- [ ] Real-time updates

#### **3.2 Notifications Bell**
- [ ] Create `NotificationBell.tsx`
- [ ] Subscribe to `notification` WebSocket events
- [ ] Show badge with count
- [ ] Dropdown with notification list
- [ ] Mark as read functionality

#### **3.3 Server Time Display**
- [ ] Create `ServerTime.tsx`
- [ ] Display GMT time with date
- [ ] Update every second
- [ ] Format: "GMT: 15:30:45 - Jan 1, 2025"

#### **3.4 Language Selector**
- [ ] Create `LanguageSelector.tsx`
- [ ] Store preference in localStorage
- [ ] Apply translations (use i18n library)

#### **3.5 Profile Dropdown**
- [ ] Fetch user: `GET /users/me`
- [ ] Create dropdown with:
  - Username
  - Email
  - Premium badge
  - Verification badge
  - Settings link
  - Logout button

---

### **Phase 4: Wallet Management (Week 3)**
**Priority: 🔴 CRITICAL**

#### **4.1 Deposit Page**
- [ ] Connect form to `POST /wallet/deposit`
- [ ] Method selection (MTN, Crypto, Bank)
- [ ] Reference input (for crypto/bank)
- [ ] Handle instant deposits (MTN) vs pending
- [ ] Show success message with transaction ID
- [ ] Display pending deposits list
- [ ] Real-time balance update

#### **4.2 Withdraw Page**
- [ ] Connect form to `POST /wallet/withdraw`
- [ ] Fetch real balance first
- [ ] Method selection
- [ ] Details form (bank account, mobile money, etc.)
- [ ] Show withdrawal limits ($2000/day regular, unlimited premium)
- [ ] Display pending withdrawals
- [ ] Show fees calculation

#### **4.3 Internal Transfer (Premium)**
- [ ] Create transfer form
- [ ] Recipient search: `GET /wallet/transfer/search?q=...`
- [ ] Amount input
- [ ] Fee payer selection
- [ ] Connect to `POST /wallet/transfer`
- [ ] Display recipient email for contact
- [ ] Show pending transfers (awaiting admin approval)
- [ ] Transfer history

#### **4.4 Transaction History**
- [ ] Fetch: `GET /wallet/transactions`
- [ ] Create `TransactionHistory.tsx`
- [ ] Filter by type (DEPOSIT, WITHDRAWAL, etc.)
- [ ] Filter by status (PENDING, COMPLETED, REJECTED)
- [ ] Pagination
- [ ] Export to CSV (optional)

---

### **Phase 5: Community Features (Week 4)**
**Priority: 🟡 HIGH**

#### **5.1 Community Sentiment Bars**
- [ ] Create `CommunitySentiment.tsx`
- [ ] Three bar pairs:
  - Buyers (green) vs Sellers (red)
  - High Volatile (yellow) vs Low Volatile (gray)
  - Blue vs Red
- [ ] Fetch totals: `GET /rounds/:id/totals`
- [ ] Subscribe to `totalsUpdated` events
- [ ] Calculate percentages
- [ ] Animate bar updates

#### **5.2 Member Chart Room**
- [ ] Create `ChatRoom.tsx`
- [ ] Room selection (GENERAL, PREMIUM, ADMIN)
- [ ] Access control (Premium/Verified only for PREMIUM)
- [ ] Fetch messages: `GET /chat/:roomType`
- [ ] Send message: `POST /chat`
- [ ] Subscribe to `messageSent` events
- [ ] Auto-scroll to bottom
- [ ] Show user badges (premium, verified)
- [ ] Admin delete button

#### **5.3 AI Suggestions**
- [ ] Create `AISuggestionPanel.tsx`
- [ ] Fetch: `GET /suggestions`
- [ ] Display minority recommendations
- [ ] Highlight in bet UI
- [ ] Refresh on new round

#### **5.4 Round History**
- [ ] Create `RoundHistory.tsx`
- [ ] Fetch: `GET /rounds/history`
- [ ] Display round cards with:
  - Round number
  - Results (winners)
  - User's bets and outcomes
  - Payouts
- [ ] Filter by date
- [ ] Pagination

#### **5.5 Last Round Result**
- [ ] Create `LastRoundResult.tsx`
- [ ] Fetch last round: `GET /rounds/history?limit=1`
- [ ] Display winners
- [ ] Show user's performance

---

### **Phase 6: Premium Features (Week 4-5)**
**Priority: 🟡 HIGH**

#### **6.1 AutoSpin Panel**
- [ ] Create `AutoSpinPanel.tsx`
- [ ] Form:
  - Market selection (OUTER, MIDDLE, INNER, GLOBAL)
  - Selection (BUY, SELL, etc.)
  - Amount per spin
  - Number of spins (max 50)
- [ ] Connect to `POST /autospin`
- [ ] Display active orders: `GET /autospin`
- [ ] Show count: `GET /autospin/active/count`
- [ ] Cancel button: `DELETE /autospin/:orderId`
- [ ] Process indicator

#### **6.2 Cancel Bets**
- [ ] Add cancel button to bet list (Premium only)
- [ ] Check round state (before freeze)
- [ ] Connect to `POST /bets/cancel/:betId`
- [ ] Show confirmation modal
- [ ] Refresh bet list after cancel

#### **6.3 Flexible Spin Timing**
- [ ] Create preferences section in Settings
- [ ] Fetch: `GET /preferences`
- [ ] Round duration selector (5/10/20 min)
- [ ] Update: `PATCH /preferences`
- [ ] Display current preference

#### **6.4 Premium Badge Display**
- [ ] Show premium badge in header
- [ ] Display premium perks list
- [ ] Show subscription expiry (if applicable)

---

### **Phase 7: Affiliate System (Week 5)**
**Priority: 🟡 HIGH**

#### **7.1 Affiliate Board**
- [ ] Create `AffiliateBoard.tsx`
- [ ] Fetch: `GET /affiliate/stats`
- [ ] Display:
  - Referral link (copy button)
  - Total referrals
  - Total commissions earned
  - Today's commissions
  - Next payout countdown
- [ ] Commission tier table
- [ ] Progress chart

#### **7.2 Referral List**
- [ ] Fetch: `GET /affiliate/referrals`
- [ ] Display referral table:
  - Username
  - Sign-up date
  - Total deposits
  - Commissions earned
  - Last payout date
- [ ] Filter by date

---

### **Phase 8: Admin Dashboard (Week 6)**
**Priority: 🟢 MEDIUM**

#### **8.1 Admin Dashboard Home**
- [ ] Create `AdminDashboardHome.tsx`
- [ ] Fetch: `GET /admin/dashboard`
- [ ] Display stats cards:
  - Total users
  - Active rounds
  - Total deposits/withdrawals
  - Pending approvals
  - Revenue
- [ ] Charts for trends
- [ ] Recent activity: `GET /admin/activity`

#### **8.2 User Management**
- [ ] Create `UserManagementPage.tsx`
- [ ] Fetch: `GET /users`
- [ ] Search/filter users
- [ ] Edit user: `PATCH /users/:id`
- [ ] Block/unblock users
- [ ] Assign badges
- [ ] Premium management

#### **8.3 Transaction Management**
- [ ] Create `TransactionManagementPage.tsx`
- [ ] Fetch: `GET /wallet/admin/transactions`
- [ ] Filter by status, type
- [ ] Approve: `POST /wallet/admin/transactions/:id/approve`
- [ ] Reject: `POST /wallet/admin/transactions/:id/reject`
- [ ] Export to CSV

#### **8.4 Affiliate Management**
- [ ] Create `AffiliateManagementPage.tsx`
- [ ] Fetch all affiliates
- [ ] Commission logs
- [ ] Override options
- [ ] Leaderboard

#### **8.5 Game Settings**
- [ ] Create `GameSettingsPage.tsx`
- [ ] Asset categories config
- [ ] Volatility modes
- [ ] Payout multipliers
- [ ] Weekend spin toggle
- [ ] Save config

---

### **Phase 9: Market Info & Utilities (Week 6-7)**
**Priority: 🟢 MEDIUM**

#### **9.1 Forex Watchlist**
- [ ] Create `ForexWatchlist.tsx`
- [ ] Integrate external forex API (e.g., Alpha Vantage, ForexFactory)
- [ ] Display currency pairs with rates
- [ ] Real-time updates

#### **9.2 News Feed**
- [ ] Create `NewsFeed.tsx`
- [ ] Integrate news API (e.g., NewsAPI)
- [ ] Display FX/forex news
- [ ] Filter by category

#### **9.3 Live Ticker**
- [ ] Create `LiveTicker.tsx`
- [ ] Scrollable currency pair rates
- [ ] Real-time updates
- [ ] Display in header or sidebar

#### **9.4 Currency Converter**
- [ ] Create `CurrencyConverter.tsx`
- [ ] Fetch exchange rates
- [ ] Input fields (amount, from, to)
- [ ] Calculate and display result

---

### **Phase 10: Polish & UX (Week 7-8)**
**Priority: 🟢 MEDIUM**

#### **10.1 Loading States**
- [ ] Add loading spinners everywhere
- [ ] Skeleton loaders for data fetching
- [ ] Disable buttons during submission

#### **10.2 Error Handling**
- [ ] Toast notifications for errors
- [ ] Network error handling
- [ ] 401 auto-logout
- [ ] Retry logic

#### **10.3 Success Messages**
- [ ] Toast notifications for success
- [ ] Confirmation modals for critical actions

#### **10.4 Responsive Design**
- [ ] Mobile-first approach
- [ ] Tablet optimization
- [ ] Desktop enhancements

#### **10.5 Dark Mode**
- [ ] Toggle in header
- [ ] Persist preference
- [ ] Apply to all components

#### **10.6 Animations**
- [ ] Smooth transitions
- [ ] Bet placement animations
- [ ] Win celebration
- [ ] Balance update animations

---

## 📁 New Files to Create

### **Components**
```
frontend/src/components/
├── SpinWheel.tsx                    # ✅ PROVIDED - Add to codebase
├── BetPlacementButtons.tsx           # NEW - Bet buttons around wheel
├── SentimentBars.tsx                 # NEW - Community power bars
├── WalletBalance.tsx                 # NEW - Header balance display
├── NotificationBell.tsx              # NEW - Notifications dropdown
├── ServerTime.tsx                    # NEW - GMT time display
├── LanguageSelector.tsx              # NEW - Language dropdown
├── TransactionHistory.tsx            # NEW - Transaction list
├── ChatRoom.tsx                      # NEW - Member chatroom
├── AISuggestionPanel.tsx             # NEW - AI suggestions
├── RoundHistory.tsx                  # NEW - History of spins
├── LastRoundResult.tsx               # NEW - Last round display
├── AutoSpinPanel.tsx                 # NEW - Auto-spin form
├── AffiliateBoard.tsx                # NEW - Affiliate dashboard
├── Leaderboard.tsx                   # NEW - Top wins leaderboard
├── LoadingSpinner.tsx                # NEW - Loading component
├── Toast.tsx                         # NEW - Toast notifications
└── ProtectedRoute.tsx                # NEW - Route protection
```

### **Lib/Utils**
```
frontend/src/lib/
├── api.ts                            # NEW - Axios instance
├── auth.ts                           # NEW - Auth service
└── socket.ts                         # NEW - Socket.IO client

frontend/src/contexts/
├── AuthContext.tsx                   # NEW - Auth state
├── SocketContext.tsx                 # NEW - Socket state
├── WalletContext.tsx                 # NEW - Wallet state
└── RoundContext.tsx                  # NEW - Round state

frontend/src/hooks/
├── useAuth.ts                        # NEW - Auth hook
├── useSocket.ts                      # NEW - Socket hook
├── useWallet.ts                      # NEW - Wallet hook
├── useRound.ts                       # NEW - Round hook
└── useBets.ts                        # NEW - Bets hook
```

### **Pages (Enhance Existing)**
```
frontend/src/Components/Dashboard/
├── SpinPage.tsx                      # 🔄 REPLACE - Use SpinWheel
├── DepositPage.tsx                   # 🔄 ENHANCE - Connect API
├── WithdrawPage.jsx                  # 🔄 ENHANCE - Connect API
├── SettingsPage.tsx                  # 🔄 ENHANCE - Add preferences
├── UserDashboard.tsx                 # 🔄 ENHANCE - Add stats
└── DashboardHome.jsx                 # 🔄 ENHANCE - Admin dashboard
```

---

## 🎨 Forex Theme UI Enhancements

### **Color Palette** (from SpinWheel)
```css
--bg-primary: #0b1020;
--bg-secondary: #0f1733;
--grid-lines: #1c2540;
--text-primary: #e5eefc;
--buy: #24d17e;        /* Green for BUY */
--sell: #ea3943;       /* Red for SELL */
--blue: #3ea7ff;       /* Blue option */
--red: #ff4d4d;        /* Red option */
--high-vol: #f0c419;   /* Yellow for HIGH */
--low-vol: #6b7280;    /* Gray for LOW */
--indecision: #a78bfa; /* Purple for INDECISION */
--ring-line: rgba(255,255,255,0.08);
--win-glow: rgba(255,255,255,0.35);
```

### **Typography**
- Use monospace font for numbers (prices, timers)
- Bold for important values
- Smaller text for secondary info

### **Layout**
- Dark background (#0b1020)
- Card-based layout with subtle borders
- Grid system for dashboard
- Sidebar navigation

### **Components Style**
- All buttons: forex-themed colors
- Cards: dark with subtle glow on hover
- Inputs: dark background, light text
- Tables: dark theme with alternating row colors

---

## 🔧 Environment Variables

```env
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=ForexAIExchange
```

---

## 📦 Additional Dependencies

```json
{
  "dependencies": {
    "react-hot-toast": "^2.4.1",        // Toast notifications
    "date-fns": "^3.6.0",                // Date formatting
    "recharts": "^2.12.0",               // Charts for analytics
    "socket.io-client": "^4.8.1"         // Already installed ✅
  }
}
```

---

## ✅ Quick Start Checklist

### **Immediate Actions (Day 1)**
1. [ ] Add `SpinWheel.tsx` to `frontend/src/components/`
2. [ ] Create `lib/api.ts` with Axios setup
3. [ ] Create `lib/auth.ts` with login/register
4. [ ] Create `lib/socket.ts` with Socket.IO connection
5. [ ] Create context providers
6. [ ] Connect login page to backend API

### **Week 1 Goals**
- [ ] Complete Phase 1 (Core Infrastructure)
- [ ] Complete Phase 2.1 (SpinWheel integration)
- [ ] Test authentication flow
- [ ] Test WebSocket connection

### **Week 2 Goals**
- [ ] Complete Phase 2 (Spin Page)
- [ ] Complete Phase 3 (Header & Navigation)
- [ ] Complete Phase 4 (Wallet Management)

---

## 📝 Notes

1. **SpinWheel Component**: The provided component is excellent. It just needs:
   - Props from backend (round state, countdown, winners)
   - Real-time totals integration (could add visual overlays)
   - Bet placement buttons around it

2. **Bet Placement**: Create buttons around the wheel or as an overlay. Options:
   - Circular buttons matching ring positions
   - Sidebar panel with bet controls
   - Bottom panel with all options

3. **Real-time Updates**: Critical for forex theme. Everything must update instantly via WebSocket.

4. **Forex Theme**: Dark colors, professional look, trading platform aesthetic. Use the color palette from SpinWheel.

5. **Mobile Responsive**: Ensure SpinWheel scales well on mobile. May need responsive sizing.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Status**: Ready for Implementation


