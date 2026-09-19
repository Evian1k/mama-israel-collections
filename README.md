# Mama Israel Collections — E-commerce

> **Style • Elegance • You** — the official online store for Mama Israel Collections, a Kenyan women's fashion boutique.

Production-quality clothing e-commerce built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui**.

## Current status

| Phase | Scope | State |
|---|---|---|
| **Phase 1** | Complete frontend — customer store + private admin panel, API-first architecture | ✅ **Done** |
| **Phase 2** | Standalone REST backend (Node + Fastify + PostgreSQL + Prisma), M-Pesa | 📋 Planned — see [`docs/BACKEND_IMPLEMENTATION_PLAN.md`](docs/BACKEND_IMPLEMENTATION_PLAN.md) |

The frontend talks to a **temporary development adapter** (Next.js route handlers +
an in-memory dev store) that implements the exact API contract the Phase 2
backend will serve. When the real backend exists, set
`NEXT_PUBLIC_API_URL=https://<backend>` and nothing else changes.

## Quick start

```bash
bun install        # or npm install
cp .env.example .env   # then adjust values
bun run dev        # http://localhost:3000
bun run lint       # eslint (should report 0 errors)
bunx tsc --noEmit  # type check (0 errors)
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata/sitemap |
| `NEXT_PUBLIC_API_URL` | **Phase 2 backend base URL. Empty = dev adapter (same origin).** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Business WhatsApp number, international digits (e.g. `254712345678`). Optional — can also be set in Admin → Settings. Until set, every WhatsApp UI stays hidden. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Dev-adapter admin login (offline dev only — ignored when the backend is connected). No defaults are shipped; set your own values. The production admin account is created by the backend from its own `ADMIN_EMAIL` / `ADMIN_PASSWORD` and the owner is required to change the setup password at first login. |

## The store starts EMPTY — by design

No fake products, orders, customers or statistics ship with this codebase.
Every screen has polished loading / empty / error states. To preview the full
experience with clearly-labelled sample fixtures:

1. Sign in at `/admin/login` (your configured credentials).
2. Dashboard → **Load sample catalogue** (one click, fully reversible via
   *Clear sample data* / *Reset store* in Settings → Development data).
3. Configure your real WhatsApp number & contact details in **Admin → Settings**.

## Project structure

```
src/
  app/
    (storefront)/          # customer website (header/footer layout)
      page.tsx             #   home
      shop/                #   /shop + /shop/[category]
      products/[slug]/     #   product detail
      cart/ checkout/      #   bag + checkout (pay on delivery)
      order-confirmation/  #   /order-confirmation/[orderNumber]
      about/ contact/ privacy-policy/ terms/ shipping/
    admin/                 # private admin (own layout, noindex, guarded)
      login/ products/ orders/ customers/ categories/ analytics/ settings/
    api/                   # dev-adapter REST API (replaced by Phase 2 backend)
    sitemap.ts robots.ts   # SEO
  components/
    layout/                # site header/footer
    shared/                # product-card, empty/error states, skeletons…
    home/ shop/ product/ cart/ checkout/ contact/   # storefront features
    admin/                 # shell, page-header, stat-card, feature views
    ui/                    # shadcn/ui primitives
  config/store.ts          # ★ ALL brand copy & business settings (edit me)
  features/
    cart/                  # zustand cart (localStorage-persisted)
    admin/                 # admin session store
    checkout/              # checkout zod schema
  hooks/                   # TanStack Query hooks (+ hooks/admin/)
  services/api/            # ★ the ONLY place fetch() happens
  server/                  # dev adapter: dev-store + validation + auth
  types/                   # domain model & API contracts
docs/BACKEND_IMPLEMENTATION_PLAN.md   # Phase 2 blueprint (schema, APIs, M-Pesa…)
```

## Admin panel

Private, unlisted (`/admin`), `noindex`. Guarded by a session token; every
`/api/admin/*` call requires `Authorization: Bearer <token>`.

- **Dashboard** — real counts only (zeros until data exists), low-stock alerts, recent orders, dev data tools.
- **Products** — CRUD with multi-image uploader (drag & drop, progress, reorder, primary image), sizes/colours editors, sale pricing, stock + low-stock threshold, featured/new/active flags.
- **Orders** — status pipeline (pending → confirmed → processing → ready → shipped → delivered / cancelled) with history timeline, payment status, customer details.
- **Customers** — auto-built from orders (contact, spend, order history).
- **Categories** — CRUD, product counts, delete protection.
- **Analytics** — orders/day chart, AOV, fulfilment/cancellation rates, best sellers (computed from real orders only).
- **Settings** — brand, contact (WhatsApp number), socials, delivery fee rules, low-stock threshold, development data controls.

## Golden paths to smoke-test

1. Home → category/product navigation → product detail (size required, stock-aware).
2. Add to bag → cart quantity/remove → checkout (Kenyan phone validation) → order placed → confirmation page with order number.
3. Admin login → create category → create product with images → appears in shop instantly.
4. Place an order → appears in admin orders → update status → status visible on confirmation page.
5. Settings → set WhatsApp number → WhatsApp buttons appear across the storefront.

## Deployment target

- **Frontend**: Vercel (`NEXT_PUBLIC_*` env vars only — no secrets client-side).
- **Backend (Phase 2)**: Render + managed PostgreSQL — full plan in `docs/`.
