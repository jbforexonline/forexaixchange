# Vercel Deployment Troubleshooting

## Common Issues and Solutions

### 1. Serverless Function Crash (500 Error)

**Symptoms:**
- `FUNCTION_INVOCATION_FAILED`
- `500: INTERNAL_SERVER_ERROR`

**Possible Causes & Solutions:**

#### a) Prisma Client Not Generated
```bash
# In Vercel build command:
npm run build && npx prisma generate
```

#### b) Missing Environment Variables
Check Vercel Dashboard → Settings → Environment Variables:
- `DATABASE_URL` must be set
- `JWT_SECRET` must be set
- All required variables are present

#### c) Import Path Issues
The serverless entry point uses dynamic imports to handle path resolution:
```typescript
const { AppModule } = await import('../src/app.module');
```

#### d) Database Connection Failures
- Verify `DATABASE_URL` is correct
- Check SSL mode: Neon requires `?sslmode=require`
- Verify database is accessible (not blocked by firewall)

### 2. Module Not Found Errors

**Error:** `Cannot find module '@nestjs/core'`

**Solution:**
- Ensure `package.json` has all dependencies
- Check that `node_modules` is included in deployment
- Verify build command runs `npm install`

### 3. Path Resolution Errors

**Error:** `Cannot resolve '../src/app.module'`

**Solution:**
- Verify Vercel project root directory is set to `backend` (if deploying from monorepo)
- Or set it to root and adjust paths in `vercel.json`

### 4. Prisma Client Errors

**Error:** `PrismaClient is not configured`

**Solution:**
- Ensure `postinstall` script runs: `prisma generate`
- Or add `npx prisma generate` to build command
- Verify `node_modules/.prisma` is included

### 5. TypeScript Compilation Errors

**Error:** Type errors during build

**Solution:**
- Check `tsconfig.json` is configured correctly
- Ensure all dependencies have type definitions
- Use `skipLibCheck: true` in tsconfig if needed

## Debugging Steps

### 1. Check Build Logs
- Go to Vercel Dashboard → Project → Deployments
- Click on failed deployment
- Check "Build Logs" for errors

### 2. Check Function Logs
- Go to Vercel Dashboard → Project → Functions
- Click on your function
- Check "Logs" tab for runtime errors

### 3. Test Locally
```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
cd backend
vercel dev
```

### 4. Enable Detailed Logging
The serverless entry point (`api/index.ts`) now includes:
- Console logs for initialization
- Error logging with stack traces
- Try-catch blocks for better error handling

### 5. Check Environment Variables
```bash
# Pull environment variables locally
vercel env pull .env.local

# Verify all variables are set
cat .env.local
```

## Vercel Project Settings

### Root Directory
If deploying from monorepo:
- Set **Root Directory** to `backend` in Vercel project settings

### Build Command
Should be:
```bash
npm run build && npx prisma generate
```

Or use the `vercel-build` script:
```bash
npm run vercel-build
```

### Output Directory
Leave empty (not used for serverless functions)

### Install Command
```bash
npm install
```

## Environment Variables Checklist

Required:
- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens
- [ ] `JWT_EXPIRES_IN` - Token expiration (e.g., `24h`)
- [ ] `NODE_ENV` - Set to `production`

Optional but recommended:
- [ ] `FRONTEND_URL` - Frontend URL for CORS
- [ ] `REDIS_HOST` - Redis hostname
- [ ] `REDIS_PORT` - Redis port
- [ ] `REDIS_PASSWORD` - Redis password
- [ ] `ENABLE_SWAGGER` - Enable Swagger docs (`true`/`false`)

## Quick Fixes

### Fix 1: Regenerate Prisma Client
Add to build command:
```bash
npm install && npm run build && npx prisma generate
```

### Fix 2: Use Dynamic Imports
Already implemented in `api/index.ts`:
```typescript
const { AppModule } = await import('../src/app.module');
```

### Fix 3: Enable Error Logging
Already implemented - errors are logged to Vercel function logs.

### Fix 4: Check CORS
CORS is configured to allow all origins in serverless environment:
```typescript
app.enableCors({ origin: true });
```

## Testing Deployment

1. **Health Check:**
   ```
   GET https://your-project.vercel.app/health
   ```

2. **Swagger Docs:**
   ```
   GET https://your-project.vercel.app/api/docs
   ```

3. **Check Function Logs:**
   - Vercel Dashboard → Functions → View Logs

## Still Having Issues?

1. Check Vercel Status: https://status.vercel.com
2. Review Vercel Documentation: https://vercel.com/docs
3. Check NestJS on Vercel: https://docs.nestjs.com/faq/serverless
4. Review function logs in Vercel Dashboard

## Recent Changes Made

✅ Added error handling with try-catch blocks
✅ Added console logging for debugging
✅ Used dynamic imports for better module resolution
✅ Improved CORS configuration for serverless
✅ Added Prisma generate to build command
✅ Added includeFiles to vercel.json for Prisma Client

