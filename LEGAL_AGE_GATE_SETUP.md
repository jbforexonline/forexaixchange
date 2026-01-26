# Legal & Age Gate – Setup and Testing

## Overview

- **Age confirmation (18+)**: Required only at **signup** (not on every visit or login). Stored server-side with the user.
- **Signup**: Two required checkboxes—“I am 18+” and “I agree to Terms & Privacy”—both must be checked (AND logic). Backend validates and stores acceptances + age in the same transaction as user creation.
- **Terms & Privacy**: Versioned, auditable; one active doc per type; enforced via guard on protected routes.
- **Admin**: Legal management UI to create/activate versions and preview.

## Setup

### 1. Database

```bash
cd backend
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
```

### 2. Seed (Terms v1.0, Privacy v1.0, acceptances for seeded users)

```bash
cd backend
npm run db:seed
```

### 3. Backend

```bash
cd backend
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm run dev
```

Ensure `NEXT_PUBLIC_BACKEND_URL` points at your backend (e.g. `http://localhost:4000`).

---

## Testing

### Signup (age + terms)

1. Go to `/register`.
2. Fill the form. **Leave both checkboxes unchecked** → “Create Account” is disabled; submitting (e.g. via Enter) yields an error.
3. Check **both** “I am 18 or older” and “I agree to Terms & Privacy” → “Create Account” enables.
4. Submit → registration succeeds; user has `isAge18Confirmed` and acceptances for current Terms and Privacy.
5. **Terms / Privacy links**: Open `/terms` or `/privacy` (e.g. from register) — they load without blocking; no age gate on visit/login.

### Re-acceptance (LEGAL_REACCEPT_REQUIRED / AGE_CONFIRM_REQUIRED)

**Simulate “new terms” (re-accept required):**

1. Log in as a normal user (e.g. `user1@test.com` / `password123`).
2. As **admin**, go to **Admin → System Settings → Legal (Terms & Privacy)**.
3. Create a new **Terms** version (e.g. `1.1`), add content, set effective date, **Create draft**.
4. **Activate** that version (old active Terms is deactivated).
5. In the same browser, use the app as the normal user (e.g. refresh or open dashboard).
6. `GET /auth/me` (and other protected calls) return **403** with `code: "LEGAL_REACCEPT_REQUIRED"`.
7. A **re-accept modal** appears. Check “I am 18+” and “I agree to Terms & Privacy”, then **Continue**.
8. Modal closes; app works again.

**Simulate “age confirm required”:**

1. Manually set `is_age_18_confirmed = false` for a user in the DB (or use a user created before age fields existed).
2. Log in as that user.
3. Protected routes return **403** with `code: "AGE_CONFIRM_REQUIRED"`.
4. Re-accept modal appears; confirm 18+ and terms → **Continue** → app works.

### Admin Legal UI

1. Log in as **Super Admin** or **Admin**.
2. Go to **Admin → Legal (Terms & Privacy)** (or **System Settings → Legal** in Super Admin).
3. **Terms** / **Privacy** tabs: list versions, **Preview**, **Activate**.
4. **Create new version**: version string, effective date, markdown content → **Create draft**.
5. **Activate** a draft → it becomes the single active version for that type; the previous active one is deactivated.

### API (optional)

- **Public**: `GET /api/legal/terms/active`, `GET /api/legal/privacy/active`.
- **Auth**: `POST /api/legal/terms/accept`, `POST /api/legal/privacy/accept`, `POST /api/legal/age-confirm`.
- **Admin** (JWT + admin role):  
  `GET /api/admin/legal/terms/versions`, `GET /api/admin/legal/privacy/versions`,  
  `GET /api/admin/legal/preview/:id`,  
  `POST /api/admin/legal/:type` (body: `version`, `content`, `effectiveAt`),  
  `PUT /api/admin/legal/:id/activate`.

---

## Files Touched

- **Prisma**: `schema` (User age fields, `LegalDocument`, `UserLegalAcceptance`), migration `20260126000000_add_legal_and_age_gate`, `seed.ts`.
- **Backend**: `LegalModule`, `LegalService`, `LegalController`; `AdminLegalModule`, `AdminLegalService`, `AdminLegalController`; `LegalComplianceGuard`; `AllExceptionsFilter` (403 `code`); `AuthModule`/`AuthService`/`AuthController` (register + legal/age); `RegisterDto`; protected controllers using `LegalComplianceGuard`.
- **Frontend**: `AgeGate`, `LegalReAcceptModal`, `/terms`, `/privacy`, register checkboxes + legal links, `lib/api/legal`, `lib/api/admin-legal`, `auth.verifyToken` (403 + event), `RoleBasedLayout` (verify + public paths), admin **Legal** page and nav.

---

## Notes

- **Demo accounts** (`POST /auth/demo`): Created without legal/age. If they hit protected routes, they will receive 403 and must use the re-accept modal.
- **Google OAuth signup**: Users created via Google do not go through the register flow. They will receive 403 until they complete the re-accept modal (confirm 18+ and accept Terms & Privacy).
