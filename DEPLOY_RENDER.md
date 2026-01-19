# Deploying to Render (ForexAI Exchange)

This repo is a monorepo with:

- **Backend**: NestJS + Prisma (`backend/`)
- **Frontend**: Next.js (`frontend/`)
- **DB**: PostgreSQL (managed on Render)
- **Cache**: Redis (managed on Render)

The recommended Render setup is declared in `render.yaml` (Render Blueprint).

## What gets deployed

- **Postgres**: `forexaixchange-db`
- **Redis**: `forexaixchange-redis`
- **Backend web service**: `forexaixchange-backend`
- **Frontend web service**: `forexaixchange-frontend`

## 1) Create services from the Blueprint

1. Push your code to GitHub/GitLab.
2. In Render, choose **New → Blueprint**.
3. Select this repository (Render will read `render.yaml`).

Render will create the DB, Redis, backend, and frontend.

## 2) Set the cross-service URLs (important)

After the first deploy, Render will assign public URLs:

- Backend URL: `https://<backend-name>.onrender.com`
- Frontend URL: `https://<frontend-name>.onrender.com`

Update environment variables:

### Backend (`forexaixchange-backend`)

- `FRONTEND_URL`: set to your **frontend** Render URL
  - Example: `https://forexaixchange-frontend.onrender.com`

This is used for CORS in `backend/src/main.ts`.

### Frontend (`forexaixchange-frontend`)

- `NEXT_PUBLIC_BACKEND_URL`: set to your **backend** Render URL
  - Example: `https://forexaixchange-backend.onrender.com`

This is used for API calls and websockets throughout the frontend.

## 3) Database migrations (automatic)

The backend build step runs:

- `prisma generate`
- `prisma migrate deploy`

So schema migrations will be applied on deploy.

## 4) Seeding (manual / one-time)

If you need initial data (premium plans, admin user, etc.), run the Prisma seed **once** after the first successful deploy:

1. Open the backend service in Render
2. Use **Shell** and run:

```bash
cd backend
npx prisma db seed
```

## 5) Health checks

- Backend: `GET /health` (configured as Render health check)

Optional deeper checks:

- `GET /health/database`
- `GET /health/cache`

## 6) Required environment variables (summary)

Render will automatically inject:

- `DATABASE_URL` (from the managed Postgres instance)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (from the managed Redis instance)
- `JWT_SECRET` (generated value from `render.yaml`)

You must set manually after URLs exist:

- `FRONTEND_URL` (backend)
- `NEXT_PUBLIC_BACKEND_URL` (frontend)

## 7) Notes / common pitfalls

- **Render sets `PORT` automatically** for web services. The backend and frontend both already read `process.env.PORT`.
- If you change the frontend domain, remember to update `FRONTEND_URL` on the backend so CORS continues to work.

