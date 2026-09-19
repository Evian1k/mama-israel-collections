# BACKEND IMPLEMENTATION PLAN — Mama Israel Collections

**Phase 2 blueprint.** The Phase 1 frontend (this repository) is API-first: every
screen consumes the contracts in `src/types/*` through `src/services/api/*`.
This document specifies the standalone backend that will become the single
source of truth. When it ships, the frontend needs **one change**:
`NEXT_PUBLIC_API_URL=https://<backend-host>`.

---

## 1. Architecture overview

```
Browser ── HTTPS ──► Next.js frontend (Vercel)
                          │  fetch via src/services/api (NEXT_PUBLIC_API_URL)
                          ▼
                     REST API — Node.js 20 + TypeScript + Fastify (Render)
                          │  Prisma ORM
                          ▼
                     PostgreSQL 16 (Render / Neon)
                          │
                     Cloudinary (product images)   M-Pesa Daraja (payments)
```

- **Frontend**: this repo, deployed on Vercel. Stateless.
- **Backend**: separate repository (`mama-israel-api`), Fastify + TypeScript,
  Zod validation, JWT auth, REST. Deployed on Render.
- **Database**: PostgreSQL (managed). Prisma migrations via `prisma migrate deploy`.
- All API responses keep the existing envelope:
  `{ "success": true, "data": … } | { "success": false, "error": { code, message, details? } }`
  — identical to the Phase 1 dev adapter, so no frontend rewriting is needed.

---

## 2. PostgreSQL schema (Prisma models)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum OrderStatus {
  pending confirmed processing ready shipped delivered cancelled
}
enum PaymentStatus { unpaid pending paid refunded }
enum PaymentMethod { pay_on_delivery mpesa card }

model Category {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(60)
  slug        String   @unique @db.VarChar(80)
  description String   @db.VarChar(500) @default("")
  imageUrl    String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  products    Product[]
  @@index([isActive, sortOrder])
}

model Product {
  id                String        @id @default(cuid())
  name              String        @db.VarChar(120)
  slug              String        @unique @db.VarChar(140)
  description       String        @db.Text
  category          Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  categoryId        String
  price             Decimal       @db.Decimal(10, 2)
  compareAtPrice    Decimal?      @db.Decimal(10, 2)
  sku               String        @unique @db.VarChar(40)
  sizes             String[]      @default([])          // e.g. ["S","M","L"]
  colors            Json          @default("[]")        // [{ name, hex }]
  stockQuantity     Int           @default(0)
  lowStockThreshold Int           @default(3)
  isFeatured        Boolean       @default(false)
  isNewArrival      Boolean       @default(true)
  isActive          Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  images            ProductImage[]
  orderItems        OrderItem[]
  @@index([isActive, isFeatured, createdAt])
  @@index([categoryId, isActive])
  @@index([isNewArrival, createdAt])
}

model ProductImage {
  id        String  @id @default(cuid())
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  url       String  @db.VarChar(500)
  alt       String  @db.VarChar(200) @default("")
  isPrimary Boolean @default(false)
  sortOrder Int     @default(0)
  @@index([productId, sortOrder])
}

model Customer {
  id        String   @id @default(cuid())
  fullName  String   @db.VarChar(80)
  phone     String   @unique @db.VarChar(16)   // normalised +2547XXXXXXXX
  email     String?  @db.VarChar(120)
  notes     String?  @db.VarChar(500)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
  @@index([phone])
}

model Order {
  id             String        @id @default(cuid())
  orderNumber    String        @unique @db.VarChar(20)   // MIC-YYMM-NNNN
  customer       Customer      @relation(fields: [customerId], references: [id])
  customerId     String
  fullName       String        @db.VarChar(80)   // snapshot at order time
  phone          String        @db.VarChar(16)
  email          String?       @db.VarChar(120)
  deliveryLocation String      @db.VarChar(160)
  notes          String?       @db.VarChar(500)
  subtotal       Decimal       @db.Decimal(10, 2)
  deliveryFee    Decimal       @db.Decimal(10, 2) @default(0)
  total          Decimal       @db.Decimal(10, 2)
  paymentMethod  PaymentMethod @default(pay_on_delivery)
  paymentStatus  PaymentStatus @default(unpaid)
  status         OrderStatus   @default(pending)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  items          OrderItem[]
  statusHistory  OrderStatusEvent[]
  mpesaReceipt   String?       @db.VarChar(40)
  @@index([status, createdAt])
  @@index([customerId, createdAt])
  @@index([orderNumber])
}

model OrderItem {
  id           String  @id @default(cuid())
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId      String
  product      Product @relation(fields: [productId], references: [id], onDelete: Restrict)
  productId    String
  productName  String  @db.VarChar(120)   // snapshot
  productSlug  String  @db.VarChar(140)
  imageUrl     String?
  size         String? @db.VarChar(20)
  color        String? @db.VarChar(40)
  unitPrice    Decimal @db.Decimal(10, 2) // snapshot
  quantity     Int
  lineTotal    Decimal @db.Decimal(10, 2)
  @@index([orderId])
  @@index([productId])
}

model OrderStatusEvent {
  id        String      @id @default(cuid())
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId   String
  status    OrderStatus
  note      String?     @db.VarChar(300)
  createdAt DateTime    @default(now())
  @@index([orderId, createdAt])
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique @db.VarChar(120)
  name         String   @db.VarChar(80)
  passwordHash String                                   // argon2id
  role         String   @default("admin")               // admin | super_admin
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
}

model RefreshToken {
  id         String   @id @default(cuid())
  user       AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
  @@index([userId])
}

model NewsletterSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(120)
  createdAt DateTime @default(now())
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(80)
  email     String   @db.VarChar(120)
  phone     String?  @db.VarChar(16)
  message   String   @db.VarChar(2000)
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([isRead, createdAt])
}

model StoreSetting {
  key   String @id @db.VarChar(60)   // single row "main" holding JSON, or key/value
  value Json
}
```

> Note: dev-adapter types in `src/types/*` match this schema field-for-field.
> `Customer` becomes a real table (upsert by normalised phone on first order).

---

## 3. API routes (final contract)

Public (`/api`):
| Method | Path | Notes |
|---|---|---|
| GET | `/store` | StoreSettings |
| GET | `/categories` | active only |
| GET | `/products` | full filter/sort/pagination (query params already implemented client-side) |
| GET | `/products/featured` | |
| GET | `/products/new-arrivals` | |
| GET | `/products/search?q=` | |
| GET | `/products/:slug` | slug or id |
| POST | `/orders` | server re-prices; decrements stock in a transaction |
| GET | `/orders/:orderNumber` | public status lookup (rate-limited) |
| POST | `/newsletter` | |
| POST | `/contact` | rate-limited |

Admin (`/api/admin`, requires `Authorization: Bearer <access token>`):
| Method | Path |
|---|---|
| POST | `/auth/login` · POST `/auth/refresh` · POST `/auth/logout` · GET `/auth/me` |
| GET/POST | `/products` |
| GET/PATCH/DELETE | `/products/:id` |
| GET | `/orders` · GET `/orders/:id` |
| PATCH | `/orders/:id/status` · PATCH `/orders/:id` (paymentStatus) |
| GET | `/customers` · GET `/customers/:id` |
| GET/POST | `/categories` · PATCH/DELETE `/categories/:id` |
| GET/PATCH | `/settings` |
| GET | `/stats` · GET `/analytics` |
| POST | `/uploads` (or Cloudinary signed-direct upload, preferred) |

All list endpoints accept `page`/`limit` and return `Paginated<T>` exactly as
`src/types/api.ts` defines.

---

## 4. Authentication

- **Admin login**: email + password (argon2id hashes), returns short-lived
  access JWT (15 min, `httpOnly` not required — frontend keeps in memory +
  refresh flow) and long-lived refresh token (7–30 d, hashed in
  `RefreshToken`, rotation on use, revocation list).
- Login rate limit: 5 attempts / 15 min / IP+email (exponential backoff).
- Constant-time comparison; generic error messages; login audit log.
- Password reset via signed email token (Phase 2.1 can defer if owner-managed).

## 5. Admin authorization

- Fastify preHandler `requireAdmin` verifies JWT + loads user + checks
  `role === "admin"`; refresh endpoint rotates and revokes.
- All `/api/admin/*` routes return 401 (no session) or 403 (insufficient role)
  using the standard error envelope — the frontend already handles both.
- CORS: allow only the Vercel domain(s). Strict `SameSite`/`Secure` cookies if
  cookie-based refresh is chosen.

## 6. Product management

- Create/update validated with the same Zod schemas as
  `src/server/validation.ts` (shared package `@mama-israel/contracts` optional).
- Slug uniqueness: auto-slug + `-2`, `-3` suffix (mirrors dev adapter logic).
- SKU: unique, auto-generated `MIC-NNNN` when omitted.
- Deleting a product referenced by order items → soft delete (`isActive=false`)
  or `Restrict` error; UI already surfaces both paths.
- Price changes never mutate historical `OrderItem.unitPrice` (snapshots).
- Stock decrements happen inside the order-creation transaction with
  `SELECT … FOR UPDATE`-equivalent (`prisma.$transaction` + conditional
  `updateMany({ where: { id, stockQuantity: { gte: qty } } })`) to prevent
  overselling.

## 7. Categories

- CRUD as contract; delete blocked while products reference the category
  (409 CONFLICT) — dev adapter behaviour preserved.
- `productCount` computed via `_count`.

## 8. Orders

- `POST /orders`: validate payload → load products `FOR UPDATE` → validate
  active/stock/variant → compute totals server-side → create order + items +
  `pending` status event → decrement stock → return created order (201).
  Failure codes match what the frontend already handles:
  `OUT_OF_STOCK`, `INVALID_VARIANT`, `PRODUCT_NOT_FOUND`, `PRICE_CHANGED`.
- Order numbers: `MIC-YYMM-NNNN` from a Postgres sequence.
- Status machine (enforced server-side, admin UI already shows all states):
  `pending → confirmed → processing → ready → shipped → delivered`;
  any → `cancelled` (not from `delivered`). Every change writes an
  `OrderStatusEvent` (history powers the admin timeline + customer page).
- Customer lookup by order number is public but rate-limited (5/min/IP).

## 9. Customers

- Upsert by normalised phone (`07…` → `+2547…`) on order creation.
- Aggregates (ordersCount, totalSpent, lastOrderAt) via SQL views or query —
  response shape identical to `CustomerSummary`/`CustomerDetail`.

## 10. Image storage (Cloudinary recommended)

- Backend `POST /api/admin/uploads` → Cloudinary signed upload
  (`folder=mama-israel/products`, 5 MB cap, jpg/png/webp/avif only) → returns
  `{ url, width, height }`; store URL in `ProductImage`.
- Preferred alternative: browser → Cloudinary **direct signed upload** (backend
  only mints signatures) — keeps large files off the API.
- `next/image` already handles remote images; add the Cloudinary hostname to
  `next.config.ts` `images.remotePatterns` in Phase 2.
- Never store binaries in PostgreSQL.

## 11. WhatsApp integration

- Number stays a `StoreSetting` (`whatsappNumber`), editable in Admin → Settings.
- Click-to-chat links are built client-side (`src/lib/whatsapp.ts`) — no server
  dependency in Phase 2 either.
- Optional (later): WhatsApp Cloud API for automated "order confirmed" /
  "out for delivery" messages, triggered by status transitions.

## 12. M-Pesa integration (Daraja)

- STK Push (Lipa na M-Pesa Online): checkout offers M-Pesa once the owner
  enables it in Settings; backend endpoint `POST /api/payments/mpesa/stk`
  (order number, phone) → STK push → Daraja callback
  `POST /api/payments/mpesa/callback` validates + reconciles:
  `paymentStatus: pending → paid` (stores `mpesaReceipt`).
- Credentials in env: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
  `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_ENV=sandbox|production`.
- Idempotency: callbacks keyed by `CheckoutRequestID`; polling fallback job
  for unconfirmed transactions (query status every 20 s, max 5).
- Frontend impact: add an M-Pesa option to checkout's payment radio group +
  a "pending payment" state on the order confirmation page. **No data-model
  changes needed** (already modelled).

## 13. Payment status handling

- `unpaid` default (pay on delivery); `pending` while STK push in flight;
  `paid` on confirmation (auto via callback or manual admin override — admin
  UI already supports this); `refunded` manual only (admin action, reason note).
- Revenue analytics count everything except `cancelled` (frontend already
  labels it this way).

## 14. Order status handling

- Single write endpoint `PATCH /orders/:id/status` with server-side transition
  validation + `OrderStatusEvent` append; invalid transitions → 409.
- Optional: notification hook on transition (see §11).

## 15. Validation

- Zod schemas shared with frontend contracts; `parseOrThrow` pattern returns
  400 `VALIDATION_ERROR` with `details[]` (frontend toast-ready).
- Sanitise all free text (strip control chars, trim, length caps).
- Phone normalisation (Kenya) at every entry point.

## 16. Rate limiting

- `@fastify/rate-limit` (Redis adapter when scaled out): global 120 req/min/IP;
  stricter buckets: login 5/15 min, orders 5/10 min/IP, newsletter+contact
  3/10 min/IP, order lookup 10/min/IP. Return 429 `RATE_LIMITED`.

## 17. Error handling

- Central error handler → envelope `{ success:false, error:{ code, message } }`;
  internal errors logged with request id, message kept generic (500).
- HTTP codes: 400 validation, 401 auth, 403 role, 404, 409 conflicts,
  422 rare domain errors, 429 rate limit, 500.
- The frontend already maps every code to friendly copy.

## 18. Logging & observability

- `pino` structured logs (request id, user id, route, latency); error stack
  traces to Render log drain.
- Health endpoint `GET /health` (Render health check).
- Optional: Sentry for exceptions, uptime monitor on `/health`.

## 19. Database indexes

Included in the Prisma schema above: catalogue lookups (active+featured,
category+active, new-arrivals), order lookups (status+createdAt,
customer+createdAt, orderNumber unique), order items by order/product,
status events by order. Add `pg_trgm` index on `Product.name` if search moves
from `ILIKE` to fuzzy matching; consider Postgres full-text search later.

## 20. Deployment architecture

- **Render (backend)**: Web Service from `mama-israel-api` repo
  (`bun`/Node 20, build: `npm run build`, start: `node dist/server.js`),
  health check `/health`, env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `MPESA_*`, `CLOUDINARY_*`, `ADMIN_EMAIL`,
  `ADMIN_PASSWORD` (bootstrap, then rotated), `SENTRY_DSN`.
- **PostgreSQL**: Render managed Postgres (daily backups, ≥ 7-day retention)
  or Neon. `prisma migrate deploy` on release (release command).
- **Vercel (frontend)**: set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_WHATSAPP_NUMBER` optional.
- **Object storage**: Cloudinary (images). Optional Cloudflare R2 later.
- **Cron (Render)**: M-Pesa reconciliation sweeper, abandoned-cart analytics
  (optional), database backup verification.
- **Rollout plan**: deploy API with Phase 1 dev-adapter-compatible contract →
  smoke-test against staging frontend (`NEXT_PUBLIC_API_URL` pointing at
  staging) → migrate owner data (categories/products via admin UI or seed
  script) → flip production env → remove dev-adapter routes.

---

## Migration checklist (Phase 2 kickoff)

1. Scaffold `mama-israel-api` (Fastify + TS + Prisma + Zod + pino).
2. Apply schema (§2), bootstrap admin user, seed store settings.
3. Implement public routes (§3) matching envelope + pagination exactly.
4. Implement auth (§4–5); switch admin login UI to refresh flow.
5. Wire Cloudinary uploads (§10) + `next.config.ts` remote patterns.
6. Implement admin CRUD routes; E2E-test with the existing admin UI.
7. Move order creation into DB transactions (§6, §8).
8. Add rate limiting + logging + health checks (§16–18).
9. Set `NEXT_PUBLIC_API_URL` on a staging Vercel deploy; regression-test all
   golden paths (they are listed in the Phase 1 completion report).
10. M-Pesa Daraja integration (§12) → enable in production last.
```
