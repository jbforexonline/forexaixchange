# Deploy Backend to Vercel

This guide explains how to deploy your NestJS backend to Vercel.

## ⚠️ Important Notes

**Vercel Limitations:**
- **WebSockets (Socket.io)**: Vercel has limited WebSocket support. Socket.io may not work perfectly on serverless functions.
- **Long-running connections**: Vercel functions have execution time limits (10s for Hobby, 60s for Pro)
- **Database connections**: Use connection pooling for PostgreSQL (recommended: Neon, Supabase, or Prisma Data Proxy)

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Your code pushed to GitHub/GitLab/Bitbucket
- Neon PostgreSQL database (already configured)
- Environment variables ready

## Step 1: Prepare Your Repository

Make sure all changes are committed and pushed:

```bash
git add .
git commit -m "feat: add Vercel deployment configuration"
git push origin ft/render-deployment
```

## Step 2: Deploy via Vercel Dashboard

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure the project:

   **Project Settings:**
   - **Root Directory**: Set to `backend` (or leave empty if deploying from repo root)
   - **Framework Preset**: None (or select "Other")
   - **Build Command**: `npm run vercel-build` or `npm run build && npx prisma generate`
   - **Output Directory**: Leave empty (not used for serverless)
   - **Install Command**: `npm install`
   - **Node.js Version**: 20.x

   **Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://neondb_owner:npg_ecfpZ1aVES9O@ep-dark-glade-afaisjik-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=100
   ```

5. Click **"Deploy"**

### Option B: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to backend directory:
   ```bash
   cd backend
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: `forexaixchange-backend`
   - Directory: `./`
   - Override settings? **No**

5. Set environment variables:
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add FRONTEND_URL
   # ... add all other variables
   ```

6. Deploy to production:
   ```bash
   vercel --prod
   ```

## Step 3: Project Structure

For Vercel to work correctly, ensure this structure:

```
backend/
├── api/
│   └── index.ts          # Serverless entry point
├── src/
│   └── ...               # Your NestJS app
├── prisma/
│   └── ...               # Prisma schema and migrations
├── vercel.json           # Vercel configuration
├── package.json
└── tsconfig.json
```

## Step 4: Environment Variables Setup

Set these in Vercel Dashboard → Settings → Environment Variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT tokens | Generate a strong random string |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` |
| `NODE_ENV` | Environment | `production` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-frontend.vercel.app` |
| `REDIS_HOST` | Redis hostname | Your Redis host |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | Your Redis password |
| `THROTTLE_TTL` | Rate limit TTL | `60000` |
| `THROTTLE_LIMIT` | Rate limit max requests | `100` |
| `ENABLE_SWAGGER` | Enable Swagger in production | `true` or `false` |

**Set for:** Production, Preview, and Development environments

## Step 5: Database Migrations

Run migrations before first deployment or via Vercel CLI:

### Option A: Run Locally Before Deployment

```bash
cd backend
npx prisma migrate deploy
```

### Option B: Run via Vercel CLI

```bash
vercel env pull .env.local
cd backend
npx prisma migrate deploy
```

### Option C: Add to Build Script (Not Recommended)

Update `vercel.json` build command (can be slow):

```json
{
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "buildCommand": "npm run build && npx prisma generate && npx prisma migrate deploy"
      }
    }
  ]
}
```

## Step 6: Verify Deployment

1. Visit your Vercel deployment URL: `https://your-project.vercel.app`
2. Check health endpoint: `https://your-project.vercel.app/health`
3. Check Swagger docs: `https://your-project.vercel.app/api/docs` (if enabled)

## Troubleshooting

### Build Errors

**Error: "Cannot find module '@nestjs/core'"**
- Solution: Ensure `package.json` has all dependencies
- Run `npm install` locally to verify

**Error: "Prisma Client not generated"**
- Solution: Ensure `postinstall` script runs `prisma generate`
- Or add `npx prisma generate` to build command

### Runtime Errors

**Error: "Database connection failed"**
- Solution: Verify `DATABASE_URL` is set correctly in Vercel
- Check SSL mode requirements (Neon requires `sslmode=require`)

**Error: "502 Bad Gateway"**
- Solution: Check function logs in Vercel Dashboard
- Verify Prisma Client is generated
- Check for cold start timeout issues

**WebSocket Connection Errors**
- Solution: Vercel has limited WebSocket support
- Consider moving Socket.io to a separate service (e.g., Railway, Render)

### Function Timeout

If your functions timeout:
- Upgrade to Vercel Pro (60s timeout)
- Optimize database queries
- Use connection pooling
- Consider splitting into smaller functions

## Database Connection Pooling

For better performance on Vercel, use connection pooling:

### With Neon

Neon provides built-in connection pooling. Use the pooler URL:

```
postgresql://user:pass@ep-xxx-pooler.us-west-2.aws.neon.tech/db?sslmode=require
```

### With Prisma

Prisma has built-in connection pooling. Your current setup should work.

## Custom Domain

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown
4. Vercel will provision SSL automatically

## Monitoring

- **Function Logs**: Vercel Dashboard → Project → Functions tab
- **Analytics**: Vercel Dashboard → Analytics
- **Real-time Logs**: `vercel logs your-project-url`

## Continuous Deployment

Vercel automatically deploys when you push to:
- `main` branch → Production
- Other branches → Preview deployments

Configure in Settings → Git → Production Branch

## Cost Considerations

### Vercel Hobby (Free)
- ✅ Free for personal projects
- ✅ 100GB bandwidth/month
- ✅ Serverless functions (10s timeout)
- ⚠️ No WebSocket support

### Vercel Pro ($20/month)
- ✅ 1TB bandwidth/month
- ✅ 60s function timeout
- ✅ Team collaboration
- ⚠️ Still limited WebSocket support

## Limitations & Workarounds

### WebSockets / Socket.io

**Problem**: Vercel serverless functions don't support persistent WebSocket connections well.

**Solutions**:
1. Use Server-Sent Events (SSE) instead
2. Deploy Socket.io to a separate service (Railway, Render, Fly.io)
3. Use external WebSocket service (Ably, Pusher)

### File System

**Problem**: Vercel functions are read-only (except `/tmp`).

**Solution**: Use external storage (S3, Cloudinary) for file uploads.

### Long-running Tasks

**Problem**: Function timeout limits.

**Solution**: Use background jobs (Vercel Cron, external job queue like BullMQ with Redis).

## Summary

✅ **Deployed**: Backend is configured for Vercel
✅ **Serverless**: Uses serverless functions via `api/index.ts`
✅ **Database**: Configured for Neon PostgreSQL
✅ **Environment**: Production-ready with proper config

**Next Steps:**
1. Deploy via Vercel Dashboard or CLI
2. Set environment variables
3. Run database migrations
4. Test your endpoints
5. Configure custom domain (optional)

Your backend is ready for Vercel! 🚀

