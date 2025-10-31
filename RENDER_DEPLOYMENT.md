# Render Deployment Guide

This guide explains how to deploy the ForexAI Exchange backend to Render.

## Prerequisites

- A Render account (sign up at https://render.com)
- Your repository connected to Render (GitHub, GitLab, or Bitbucket)

## Step 1: Deploy PostgreSQL Database

1. Go to your Render Dashboard
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `forexaixchange-db`
   - **Database**: `forexaixchange`
   - **User**: `fx`
   - **Region**: Choose your preferred region
   - **PostgreSQL Version**: 15
   - **Plan**: Starter (or Free for testing)
4. Click **"Create Database"**
5. **Important**: Note down the **Internal Database URL** and **External Database URL** from the database dashboard

## Step 2: Deploy Redis (Optional but Recommended)

1. Click **"New +"** → **"Redis"**
2. Configure:
   - **Name**: `forexaixchange-redis`
   - **Region**: Same as your database
   - **Plan**: Starter (or Free for testing)
3. Click **"Create Redis"**

## Step 3: Deploy Backend Web Service

### Option A: Using render.yaml (Recommended)

1. Make sure `render.yaml` is in your repository root
2. Go to Render Dashboard → **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will detect `render.yaml` and create all services automatically
5. Review and click **"Apply"**

### Option B: Manual Setup

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure the service:

   **Basic Settings:**
   - **Name**: `forexaixchange-backend`
   - **Region**: Same as your database
   - **Branch**: `main` (or your deployment branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build && npx prisma generate`
   - **Start Command**: `npm run start:prod`

   **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<from PostgreSQL service>
   REDIS_HOST=<from Redis service>
   REDIS_PORT=<from Redis service>
   REDIS_PASSWORD=<from Redis service>
   JWT_SECRET=<generate a strong random string>
   JWT_EXPIRES_IN=24h
   FRONTEND_URL=https://your-frontend-domain.onrender.com
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=100
   ```

4. **Link Services:**
   - Link the PostgreSQL database
   - Link the Redis instance

5. Click **"Create Web Service"**

## Step 4: Run Database Migrations

After the service is deployed, you need to run migrations:

### Method 1: Using Render Shell (Recommended)

1. Go to your Web Service → **"Shell"** tab
2. Run:
   ```bash
   cd /opt/render/project/src/backend
   npx prisma migrate deploy
   npx ts-node prisma/seed.ts
   ```

### Method 2: Add to Build Command

Update your build command to include migrations:
```bash
npm ci && npm run build && npx prisma generate && npx prisma migrate deploy
```

**Note**: Migrations run automatically after deployment if added to build command.

## Step 5: Seed the Database (Optional)

If you want to seed initial data (admin users, premium plans, etc.):

1. Go to your Web Service → **"Shell"** tab
2. Run:
   ```bash
   cd /opt/render/project/src/backend
   npx ts-node prisma/seed.ts
   ```

Or add it to your build command (only runs on first deploy):
```bash
npm ci && npm run build && npx prisma generate && npx prisma migrate deploy && npx ts-node prisma/seed.ts
```

## Step 6: Verify Deployment

1. Check the **"Logs"** tab for any errors
2. Visit your service URL: `https://your-service-name.onrender.com/health`
3. Access Swagger docs: `https://your-service-name.onrender.com/api/docs`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-linked from PostgreSQL service |
| `REDIS_HOST` | Redis hostname | Auto-linked from Redis service |
| `REDIS_PORT` | Redis port | Auto-linked from Redis service |
| `REDIS_PASSWORD` | Redis password | Auto-linked from Redis service |
| `JWT_SECRET` | Secret key for JWT tokens | Generate a strong random string |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-frontend.onrender.com` |

## Default Admin Accounts (After Seeding)

- **Super Admin Email**: `superadmin@forexaixchange.com`
- **Super Admin Password**: `admin123`
- **Admin Email**: `admin@forexaixchange.com`
- **Admin Password**: `admin123`

**⚠️ IMPORTANT**: Change these passwords immediately after first login!

## Troubleshooting

### Database Connection Issues

- Ensure `DATABASE_URL` is set correctly
- Use the **Internal Database URL** for better performance
- Check that the database service is running

### Migration Errors

- Ensure Prisma Client is generated: `npx prisma generate`
- Run migrations in Render Shell: `npx prisma migrate deploy`
- Check database permissions

### Build Failures

- Check Node.js version compatibility
- Verify all dependencies in `package.json`
- Review build logs for specific errors

### Application Not Starting

- Check `PORT` environment variable matches Render's assigned port
- Verify `start:prod` script exists in `package.json`
- Review application logs for runtime errors

## Cost Estimation

- **PostgreSQL Starter**: ~$7/month
- **Redis Starter**: ~$7/month
- **Web Service Starter**: ~$7/month
- **Total**: ~$21/month

You can use free tiers for testing, but they have limitations (databases spin down after inactivity).

## Auto-Deploy

Render automatically deploys when you push to your connected branch. You can disable this in service settings.

## Next Steps

- Set up custom domain
- Configure SSL certificates
- Set up monitoring and alerts
- Configure backup schedules for database
- Deploy frontend application

