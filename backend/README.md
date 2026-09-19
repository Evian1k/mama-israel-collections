# MAMA ISRAEL API — Production Backend

Fastify 5 + TypeScript + Prisma + PostgreSQL backend for Mama Israel
Collections. Single source of truth for products, categories, orders,
customers, store settings and M-Pesa payments.

```
Fastify API (this folder)
  ├── PostgreSQL        — via Prisma, migrations only (prisma/migrations)
  ├── Cloudinary        — product image storage (local-disk fallback in dev)
  └── M-Pesa Daraja     — STK push + verified callbacks (idempotent)
```

## Commands

```bash
bun run dev          # dev server (tsx watch) on http://127.0.0.1:3900
bun run build        # tsc → dist/
bun run start        # node dist/server.js  (Render start command)
bun run db:migrate   # prisma migrate dev   (local)
bun run db:deploy    # prisma migrate deploy (production)
bun run db:seed      # DEV-ONLY sample catalogue — production starts empty
bun run test:api     # integration suite (requires dev server running)
bun run typecheck    # tsc --noEmit
```

## Layout

```
src/
  config/env.ts            environment loading + production safety checks
  lib/                     prisma, errors, mappers (DB→API contract), validation,
                           JWT, bcrypt, pricing, slugs, phone, order numbers, http
  plugins/                 cors (origin allowlist), helmet, rate-limit, uploads,
                           admin auth (JWT preHandler)
  modules/
    auth/                  login / session / logout + first-boot admin bootstrap
    store/                 GET /api/store + admin settings
    categories/            public + admin CRUD
    products/              catalogue query (raw SQL, effective-price logic) + admin CRUD + variants
    orders/                transactional checkout, status machine, history
    customers/             aggregated from real orders
    analytics/             dashboard + analytics (real SQL aggregates)
    uploads/               Cloudinary + local fallback storage
    payments/              M-Pesa STK push, callbacks, status
  shared/api-types.ts      byte-for-byte mirror of the frontend contracts
prisma/                    schema + migrations + dev-only seed
tests/api-tests.ts         85-assertion integration suite
```

## Contract discipline

`src/shared/api-types.ts` and `src/lib/mappers.ts` are the ONLY representation
of the API surface. If a type changes in the Next.js app (`src/types/*`), mirror
the change here in the same commit — the frontend must never need rewrites.

Docs: see `../docs/API.md`, `../docs/DEPLOYMENT.md`, `../docs/ENVIRONMENT.md`.
