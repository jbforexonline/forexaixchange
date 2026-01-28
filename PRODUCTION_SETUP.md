# Production Setup Guide

## Database Seeding for Production

Your deployed app requires legal documents (Terms & Privacy Policy) and initial data to function properly. Follow these steps to seed your production database on Render.

### Option 1: Run Seed via Render Shell (Recommended)

1. Go to your Render Dashboard: https://dashboard.render.com
2. Navigate to your **backend** service
3. Click on the **Shell** tab
4. Run the following command:
   ```bash
   cd backend
   npx prisma db push
   npx prisma db seed
   ```

### Option 2: Run Seed During Deploy

Add a `postbuild` script to your backend's deploy command in Render:

**Current Build Command:**
```bash
corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter frontend install --frozen-lockfile --prod=false && pnpm --filter frontend run build
```

**Updated Build Command (with seed):**
```bash
corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter frontend install --frozen-lockfile --prod=false && pnpm --filter frontend run build && cd backend && npx prisma db push && npx prisma db seed
```

### What Gets Seeded

The seed script (`backend/prisma/seed.ts`) creates:

1. **Legal Documents**
   - Terms & Conditions v1.0 (active)
   - Privacy Policy v1.0 (active)

2. **Admin Users**
   - Super Admin account
   - System accounts

3. **Premium Plans**
   - 1 Month, 3 Months, 6 Months, 1 Year plans

4. **Default Settings**
   - Min/max deposit/withdrawal amounts
   - Platform fees
   - Affiliate commission rates

### Verify Seeding

After seeding, test registration:
1. Go to your deployed app's `/register` page
2. Fill out the form and check the legal agreement boxes
3. You should be able to register successfully without the "Terms and Privacy Policy must be configured" error

### Troubleshooting

**Error: "Terms and Privacy Policy must be configured"**
- This means the legal documents aren't in the database
- Run the seed script as described above

**Error: "Connect ECONNREFUSED" during seed**
- Check that your `DATABASE_URL` environment variable is set correctly in Render
- Verify your database is running and accessible

**Seed runs but documents still missing**
- Check Render logs for errors during seed execution
- Manually verify in your database that the `LegalDocument` table has active records

## Environment Variables

Ensure these are set in your Render service:

### Backend Service
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `FRONTEND_URL` - Your frontend URL (e.g., https://yourapp.onrender.com)
- `NODE_ENV=production`

### Frontend Service  
- `NEXT_PUBLIC_BACKEND_URL` - Your backend URL (e.g., https://yourapp-backend.onrender.com)

## Post-Deployment Checklist

- [ ] Database seeded with legal documents
- [ ] Admin account accessible
- [ ] User registration working
- [ ] Login/logout working
- [ ] Terms & Privacy pages accessible
- [ ] Spin game rounds generating
- [ ] WebSocket connections stable
