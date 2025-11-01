# Deploy Database to PostgreSQL on Render

This guide explains how to push your Prisma migrations and seed data to PostgreSQL on Render.

## Overview

Your `render.yaml` is already configured to automatically run migrations during deployment. The build command includes:
```bash
npx prisma migrate deploy
```

This will automatically apply all migrations when you deploy.

## Method 1: Automatic Migration (Already Configured) ✅

When you deploy via Render Blueprint, migrations run automatically during the build process. This is the **recommended** method.

### What Happens:
1. Render creates the PostgreSQL database
2. During backend build, `npx prisma migrate deploy` runs
3. All migrations in `backend/prisma/migrations/` are applied
4. Database schema is created

**No manual steps needed!** ✅

---

## Method 2: Manual Migration via Render Shell

If you need to run migrations manually (e.g., after initial deployment):

### Step 1: Access Render Shell

1. Go to your Render Dashboard
2. Select your **Web Service** (forexaixchange-backend)
3. Click on the **"Shell"** tab
4. This opens a terminal in your deployed environment

### Step 2: Run Migrations

In the Render Shell, run:

```bash
cd /opt/render/project/src/backend
npx prisma migrate deploy
```

This will:
- Apply all pending migrations
- Create all tables and schema
- Update the `_prisma_migrations` table

### Step 3: Verify Migrations

Check if migrations were successful:

```bash
npx prisma migrate status
```

You should see: `Database schema is up to date!`

---

## Method 3: Seed the Database (Optional)

After migrations, you may want to seed initial data (admin users, premium plans, etc.).

### Option A: Via Render Shell (Recommended for First Time)

1. Open Render Shell for your web service
2. Run:

```bash
cd /opt/render/project/src/backend
npx ts-node prisma/seed.ts
```

This creates:
- Super Admin user (superadmin@forexaixchange.com / admin123)
- Admin user (admin@forexaixchange.com / admin123)
- Premium plans
- System configurations

### Option B: Add to Build Command (One-Time)

If you want seeding to happen automatically on first deploy, update `render.yaml`:

```yaml
buildCommand: cd backend && npm ci && npm run build && npx prisma generate && npx prisma migrate deploy && npx ts-node prisma/seed.ts
```

**⚠️ Warning**: This will attempt to seed on every deployment. The seed script uses `upsert`, so it's safe, but not ideal for production.

**Recommended**: Use Render Shell for initial seeding, then rely on migrations only.

---

## Complete Deployment Flow

### First Time Deployment:

1. **Deploy via Blueprint**
   - Go to Render Dashboard → "New +" → "Blueprint"
   - Connect your repository
   - Select branch `ft/render-deployment` (or merge to main)
   - Click "Apply"
   - Wait for services to deploy

2. **Migrations Run Automatically** ✅
   - Happens during build
   - Check build logs to confirm

3. **Seed Initial Data** (Optional)
   - Open Web Service → Shell tab
   - Run: `cd /opt/render/project/src/backend && npx ts-node prisma/seed.ts`

4. **Verify Deployment**
   - Visit: `https://your-service-name.onrender.com/health`
   - Visit: `https://your-service-name.onrender.com/api/docs`
   - Try logging in with seed admin credentials

### Subsequent Deployments:

- **Migrations run automatically** ✅
- **No seeding needed** (data already exists)
- Just push new code and Render auto-deploys

---

## Manual Migration Commands Reference

All commands run in Render Shell (Web Service → Shell tab):

```bash
# Navigate to backend directory
cd /opt/render/project/src/backend

# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Generate Prisma Client (if needed)
npx prisma generate

# Seed database (one-time)
npx ts-node prisma/seed.ts

# View database connection (for debugging)
echo $DATABASE_URL
```

---

## Troubleshooting

### Migration Errors

**Error: "Migration already applied"**
- This is normal if migrations already ran
- Check status: `npx prisma migrate status`

**Error: "Connection refused" or "Can't reach database"**
- Verify `DATABASE_URL` is set correctly
- Check that PostgreSQL service is running
- Ensure services are linked in Render dashboard

**Error: "Migration failed"**
- Check build logs for specific error
- Verify migration SQL files are valid
- Check database permissions

### Seeding Errors

**Error: "User already exists"**
- This is normal - seed uses `upsert`
- Safe to run multiple times

**Error: "Cannot connect to database"**
- Verify `DATABASE_URL` environment variable
- Ensure migrations ran first

### Database Connection

**Check connection string:**
```bash
# In Render Shell
echo $DATABASE_URL
```

**Test connection:**
```bash
# In Render Shell
npx prisma db execute --stdin <<< "SELECT version();"
```

---

## Environment Variables

Make sure these are set in your Render Web Service:

- ✅ `DATABASE_URL` - Auto-linked from PostgreSQL service
- ✅ `NODE_ENV=production`
- ✅ All other variables from `render.yaml`

**To verify:**
1. Go to Web Service → Environment tab
2. Check all variables are present

---

## Summary

✅ **Migrations**: Run automatically during build (already configured)
✅ **Seeding**: Run once via Render Shell after first deployment
✅ **Subsequent Updates**: Just push code, migrations auto-run

Your database will be automatically migrated every time you deploy! 🎉

