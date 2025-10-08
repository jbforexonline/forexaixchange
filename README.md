# forexaixchange — Team Setup & Developer Guide

This README is the **single source of truth** for getting the project running locally—fast and consistently across Windows, macOS, and Linux.

**What you get after completing this guide**

* A running **backend** (NestJS) on **[http://localhost:4000](http://localhost:4000)**
* A running **frontend** (Next.js) on **[http://localhost:3000](http://localhost:3000)**
* Local **PostgreSQL** and **Redis** via Docker
* Prisma connected and migrated
* Realtime heartbeat visible in the browser

---

## 0) Project Overview

* **Frontend:** Next.js (TypeScript, Tailwind)
* **Backend:** NestJS (TypeScript, REST, Socket.IO), Prisma
* **Databases:** PostgreSQL (primary), Redis (realtime/cache)
* **Dev Infra:** Docker Compose (Postgres + Redis)
* **Package manager:** pnpm (workspaces)
* **Folders**

  ```
  forexaixchange/
    backend/   # NestJS + Prisma + docker-compose in backend/infra
    frontend/  # Next.js app
  ```

---

## 1) Prerequisites (install/verify once)

### 1.1 Node.js (v20+) + Git

* Download Node LTS (>= 20) from [https://nodejs.org](https://nodejs.org)
* Install Git: [https://git-scm.com](https://git-scm.com)

Verify:

```bash
node -v
git --version
```

### 1.2 pnpm (recommended)

You can use **either** Corepack (admin on Windows) or a user-level install.

**A) Corepack (recommended if you have admin rights on Windows)**

```bash
corepack enable
corepack prepare pnpm@9 --activate
pnpm -v
```

**B) User-level install (no admin needed)**

```bash
npm i -g pnpm@9
pnpm -v
```

> If Windows shows a permission error like `EPERM ... \nodejs\pnpm`, either run PowerShell **as Administrator** or use method **B** above.

### 1.3 Docker Desktop (for Postgres & Redis)

* Install: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
* **Windows only:** enable **WSL 2** backend and **WSL Integration** in Docker Desktop settings.
* Start Docker Desktop and verify:

```bash
docker version
docker info
```

> If the **Server** section errors, Docker Desktop engine isn’t running—open the app and wait until it says **Running**.

---

## 2) Clone the repo & workspace setup

```bash
git clone <YOUR_REPO_URL> forexaixchange
cd forexaixchange
pnpm install
```

Make sure the workspace file exists (should be in the repo):

```yaml
# pnpm-workspace.yaml
packages:
  - backend
  - frontend
```

---

## 3) Environment files

**Never commit real `.env` files.** We commit examples; you copy them locally.

Create from templates (if the repo includes them), otherwise create manually as shown below.

### 3.1 Backend env

Create `backend/.env`:

```ini
PORT=4000
NODE_ENV=development

# If your docker-compose maps host 5432 -> container 5432:
DATABASE_URL=postgresql://fx:fxpass@localhost:5432/forexaixchange?schema=public

# If your machine already uses 5432 and you changed compose to 5433:
# DATABASE_URL=postgresql://fx:fxpass@localhost:5433/forexaixchange?schema=public

REDIS_URL=redis://localhost:6379
```

### 3.2 Frontend env

Create `frontend/.env.local`:

```ini
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## 4) Start developer databases (Docker)

From the repo root:

```bash
pnpm db:up
```

This runs `docker compose -f backend/infra/docker-compose.yml up -d` which starts:

* **Postgres 15** (username: `fx`, password: `fxpass`, db: `forexaixchange`)
* **Redis 7**

**Verify containers:**

```bash
docker ps --filter name=fx-postgres --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker ps --filter name=fx-redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

If Postgres host port conflicts with a local service, see **Troubleshooting → Ports in use**.

---

## 5) Run Prisma migrations

From the repo root (or from `backend/`):

```bash
pnpm --filter backend db:migrate
# which runs: prisma migrate dev
```

If you see **P1000** or **P1001** errors, jump to **Troubleshooting** below.

---

## 6) Run the apps (dev mode)

From the repo root:

```bash
pnpm dev
```

This runs **backend and frontend in parallel**.

* Frontend → [http://localhost:3000](http://localhost:3000)
* Backend health:

  * [http://localhost:4000/health](http://localhost:4000/health)
  * [http://localhost:4000/health/database](http://localhost:4000/health/database)
  * [http://localhost:4000/health/cache](http://localhost:4000/health/cache)

**Expected result in the browser:**
Frontend page shows **“Backend health: ok”** and a **heartbeat** value updating each second.

---

## 7) Project structure

```
forexaixchange/
  backend/
    infra/
      docker-compose.yml   # Postgres + Redis (dev only)
    prisma/
      schema.prisma        # Prisma models
    src/
      app.module.ts
      main.ts              # CORS enabled for http://localhost:3000
      cache/
        redis.module.ts    # ioredis provider (REDIS_CLIENT)
      database/
        prisma.service.ts  # Prisma connect/disconnect lifecycle
      monitoring/
        health.controller.ts
      realtime/
        realtime.gateway.ts# Socket.IO gateway emits 'heartbeat'
    .env                   # local only (not committed)
    package.json
  frontend/
    src/
      app/page.tsx         # health fetch + websocket heartbeat demo
    .env.local             # local only (not committed)
    package.json
  pnpm-workspace.yaml
  package.json             # root scripts (db:up/down, dev, build...)
  .gitignore
  .editorconfig
```

---

## 8) NPM scripts you’ll use most

### Root

```bash
pnpm db:up      # start Postgres + Redis via Docker
pnpm db:down    # stop and remove DB containers + volumes
pnpm dev        # run backend and frontend together (watch mode)
pnpm build      # build both apps
```

### Backend

```bash
pnpm --filter backend dev               # just backend
pnpm --filter backend db:migrate        # prisma migrate dev
pnpm --filter backend db:generate       # prisma generate
pnpm --filter backend build
```

### Frontend

```bash
pnpm --filter frontend dev
pnpm --filter frontend build
```

---

## 9) Database access (GUI)

Use any Postgres client (DBeaver, TablePlus, pgAdmin):

* **Host:** `localhost`
* **Port:** `5432` (or your override like `5433`)
* **User:** `fx`
* **Password:** `fxpass`
* **Database:** `forexaixchange`
* **SSL:** disabled (local dev)

---

## 10) Coding conventions & quality

* **TypeScript strict** in both apps
* **Self-explanatory names** for folders/modules: `monitoring`, `realtime`, `database`, `cache`
* **No .env in git** — keep only `*.example` templates
* **CORS** already enabled in `backend/src/main.ts` for `http://localhost:3000`
* Future modules to add: `auth/`, `users/`, `wallets/`, `rounds/`, `orders/`, `ledger/`

---

## 11) Quickstart (5 commands)

```bash
git clone <YOUR_REPO_URL> forexaixchange
cd forexaixchange
pnpm install
pnpm db:up
pnpm --filter backend db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) ✅

---

## 12) Troubleshooting (copy/paste fixes)

### A) Docker “pipe not found” / server not running

* Open **Docker Desktop** → wait for **Running**
* Windows: ensure **WSL 2** is installed

  ```powershell
  wsl --status
  wsl --update
  wsl --shutdown
  ```
* Re-run:

  ```bash
  docker version
  docker info
  ```

### B) Ports already in use (5432 or 4000)

**Backend port 4000**

```powershell
netstat -ano | findstr :4000
taskkill /PID <pid> /F
# or change backend/.env → PORT=4001 and frontend/.env.local → http://localhost:4001
```

**Postgres port 5432** — another local Postgres may be listening.

* Easiest: **change compose to 5433** (host) → container 5432:

`backend/infra/docker-compose.yml`

```yaml
services:
  postgres:
    ports:
      - "5433:5432"   # host:container
```

Change **backend/.env**:

```
DATABASE_URL=postgresql://fx:fxpass@localhost:5433/forexaixchange?schema=public
```

Recreate:

```bash
pnpm db:down
pnpm db:up
```

### C) Prisma P1000 (auth failed) / P1001 (can’t reach DB)

* Ensure compose is running: `pnpm db:up` and `docker ps`
* **P1000** usually means the volume was initialized with different creds.

  ```bash
  pnpm db:down   # removes containers + volumes
  pnpm db:up     # re-creates with fx/fxpass
  ```
* **P1001** means wrong host/port. Confirm your `DATABASE_URL` matches compose mapping (5432 or 5433).

### D) Windows Corepack EPERM (cannot open pnpm)

Install pnpm user-level:

```powershell
npm i -g pnpm@9
pnpm -v
```

### E) pnpm workspaces warning

Create `pnpm-workspace.yaml` at repo root:

```yaml
packages:
  - backend
  - frontend
```

### F) “Failed to fetch” in frontend (CORS)

Backend must allow the frontend origin. We already enabled:

```ts
// backend/src/main.ts
app.enableCors({
  origin: ['http://localhost:3000'],
  methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
});
```

(If you change frontend port or origin, update this list.)

### G) TypeScript errors with ioredis or Prisma

**ioredis default import:**

```ts
// backend/src/cache/redis.module.ts
import Redis from 'ioredis';
```

Ensure `tsconfig.json` has:

```json
"esModuleInterop": true,
"allowSyntheticDefaultImports": true
```

**Prisma shutdown hook:** use Nest lifecycle instead of `$on('beforeExit')`.

### H) Realtime (WebSocket) not updating

* Confirm the gateway annotation allows CORS:

  ```ts
  @WebSocketGateway({ cors: { origin: '*' } })
  ```
* Confirm the client uses the right URL:

  ```ts
  const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', { transports: ['websocket'] });
  ```

---

## 13) Useful admin commands

**Reset dev DB (danger: wipes data)**

```bash
pnpm db:down
pnpm db:up
pnpm --filter backend db:migrate
```

**Check Postgres from inside the container**

```bash
docker exec -it fx-postgres psql -U fx -d forexaixchange -c "SELECT current_user, current_database();"
```

**Tail container logs**

```bash
docker logs -f fx-postgres
docker logs -f fx-redis
```

---

## 14) Contributing

* Create feature branches from `main`
* Small, focused PRs with a clear description
* Update this README or add smaller READMEs in new modules when you add infra or commands others must know

---

## 15) Security & secrets

* Never commit real secrets. Keep only `*.example` files with placeholders.
* Use `.env` locally. In cloud envs, use a secret manager (AWS Secrets Manager, etc.).
* Rotate any credential that was accidentally committed.

---

### That’s it 🎯

If anything still blocks you, paste the exact console output (command + error) in the team chat and we’ll drop in the one-line fix.
