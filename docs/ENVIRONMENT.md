# ENVIRONMENT VARIABLES — Mama Israel Collections

Two separate services, two separate environments. **Never commit real `.env`
files. Never expose secrets through `NEXT_PUBLIC_*`** (those are inlined into
the browser bundle).

---

## Frontend (Next.js — Vercel)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **production** | Base URL of the Fastify backend, e.g. `https://mama-israel-api.onrender.com`. Empty in local dev (same origin) |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical site URL used for SEO/OG metadata |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional | Default WhatsApp number (international digits, e.g. `254712345678`). The owner normally configures it in Admin → Settings (stored in PostgreSQL) |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | no | `true` re-enables the Phase 1 in-memory sample-data buttons. Keep unset/false |
| `BACKEND_PROXY_URL` | sandbox only | Internal proxy target (e.g. `http://127.0.0.1:3900`). Next.js forwards `/api/*` and `/uploads/*` to the local backend so a single exposed port serves everything. **Never set on Vercel** |
| `DATABASE_URL` | dev adapter only | SQLite file for the Phase 1 dev adapter. The production backend ignores it |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | dev adapter only | Credentials for the in-memory Phase 1 admin login. The production backend has its own bootstrap vars |

---

## Backend (`backend/.env` locally — Render dashboard in production)

### Core

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes** | PostgreSQL connection string. The API **refuses** `file:` (SQLite) URLs and refuses to boot in production when missing |
| `JWT_SECRET` | **yes (prod)** | ≥ 32 random chars — `openssl rand -hex 48`. Signs admin JWTs |
| `JWT_EXPIRES_IN` | no | Access-token lifetime (default `7d`) |
| `PORT` | no | Defaults to 3900 locally; Render injects its own |
| `NODE_ENV` | yes (prod) | `production` enables strict config validation + generic 500s |
| `FRONTEND_URL` | **yes (prod)** | Comma-separated allowlist of frontend origins for CORS, e.g. `https://your-app.vercel.app`. Wildcard entries (`https://\*.space-z.ai`) match exactly one extra hostname label — useful for preview subdomains. **Never use a bare `*`** |

### Admin password rotation

The first-boot bootstrap never modifies an existing account. Rotate credentials in place with:

```bash
cd backend && bun run scripts/set-admin-password.ts <email> <new-password>
```

### Admin bootstrap

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | Login email. Used **only** to create the account on first boot (bcrypt-hashed). Existing accounts are never auto-modified |
| `ADMIN_PASSWORD` | Initial password (≥ 8 chars enforced in production). Rotate after first login |
| `ADMIN_NAME` | Display name (default "Store Owner") |

### Cloudinary (product images)

| Variable | Purpose |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Account cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | **Server-side only** — never sent to the browser |

Leave all three empty to use the local-disk fallback (development only).

### M-Pesa Daraja (Safaricom)

| Variable | Purpose |
|---|---|
| `MPESA_ENV` | `sandbox` or `production` (switches the Daraja base URL) |
| `MPESA_CONSUMER_KEY` | Daraja app key |
| `MPESA_CONSUMER_SECRET` | Daraja app secret (server-side only) |
| `MPESA_SHORTCODE` | Paybill/Till number |
| `MPESA_PASSKEY` | Lipa na M-Pesa Online passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS URL: `https://<api>/api/payments/mpesa/callback` |

Leave empty to disable online payments — `POST /api/payments/mpesa/stk-push`
then answers `503 PAYMENTS_NOT_CONFIGURED` honestly (no fake success).

---

## Local development quick start

```bash
# 1. Backend (backend/ folder)
cd backend
cp .env.example .env            # fill in what you have; defaults work locally
npm install
bun run dev                     # Fastify on http://127.0.0.1:3900
# Postgres: local embedded instance on 127.0.0.1:54329 (see below)

# 2. Database
bun run db:migrate              # prisma migrate dev (applies migrations)
bun run db:seed                 # DEV-ONLY sample catalogue (never in production)
bun run db:seed -- --clear      # wipe catalogue

# 3. Frontend (repo root)
bun run dev                     # Next.js on http://localhost:3000
# BACKEND_PROXY_URL=http://127.0.0.1:3900 in .env proxies /api/* to the backend

# 4. Tests (backend running)
bun run test:api                # 85 integration assertions
```

### Local embedded PostgreSQL

The repo ships an embedded PostgreSQL 17 binary (no root required):

```bash
cd backend
PG=./node_modules/@embedded-postgres/linux-x64/native/bin
$PG/initdb -D .pgdata -U postgres -A trust -E UTF8        # once
$PG/pg_ctl -D .pgdata -l .pgdata/logfile \
  -o "-p 54329 -c listen_addresses=127.0.0.1" start        # start
$PG/pg_ctl -D .pgdata stop                                 # stop
```

`DATABASE_URL` then reads `postgresql://postgres@127.0.0.1:54329/mama_israel?schema=public`.
`.pgdata/` is git-ignored and must never be deployed.
