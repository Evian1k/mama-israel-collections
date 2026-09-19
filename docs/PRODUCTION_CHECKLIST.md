# Production Checklist — Mama Israel Collections

The application reports its own configuration state at
`GET /api/admin/system/production-check` (Admin → Settings → **Production
readiness** card). This document explains every item: **WHAT** to provide,
**WHERE** to put it, **WHY** it is needed.

The server refuses to boot in production (`NODE_ENV=production`) when any
**required** item is missing. Optional items only produce warnings.

---

## Required

| # | Variable | WHAT to provide | WHERE | WHY |
|---|----------|-----------------|-------|-----|
| 1 | `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/mama_israel` | Backend host env (Render dashboard / `.env` on your server) — never in git | All products, orders, customers, payments and settings persist here. |
| 2 | `JWT_SECRET` | 32+ random characters (`openssl rand -hex 48`) | Backend env | Signs admin session tokens. Weak/missing = anyone could forge admin access. |
| 3 | `FRONTEND_URL` | Your storefront origin(s), comma-separated, e.g. `https://mamaisrael.co.ke` | Backend env | CORS allow-list — the browser may only call the API from your site. |
| 4 | `ADMIN_EMAIL` + `ADMIN_PASSWORD` | The owner's login (password 8+ chars) | Backend env — used ONLY to create the account on first boot | First admin account. The owner is forced to change this setup password at first login; afterwards credentials live (hashed) in PostgreSQL only. |
| 5 | `MPESA_MODE` | Must be `live` (or unset). `simulator` is refused in production | Backend env | Simulator is a dev-only test mode; production must never fake payments. |

> **Note — no payment-gateway credentials are required.** The store runs on
> the owner's own M-Pesa Till/Paybill with manual verification
> (Admin → Settings → Payments). The website never holds customer money and
> the developer pays no gateway fees.

## Owner configuration (in the app, not env)

| WHAT | WHERE | WHY |
|------|-------|-----|
| Store name, logo, phone, WhatsApp number, email, location, socials, description | Admin → Settings | Powers the storefront and every WhatsApp button. |
| M-Pesa Till number / Paybill number / account name / business name / payment instructions; switches for M-Pesa Till, M-Pesa Paybill, Pay on Delivery | Admin → Settings → Payments | Customers see these at checkout and pay **directly to the owner's M-Pesa**; they submit the transaction code; the owner verifies and marks the order Paid. |
| Delivery zones + fees (e.g. Nairobi — KSh 250, Pickup — KSh 0) | Admin → Settings → Delivery | Checkout calculates the fee automatically; unmatched locations show "Delivery fee will be confirmed after your order." — no prices are invented. |

## Optional (warnings until provided)

| # | Variable | WHAT to provide | WHERE | WHY it matters |
|---|----------|-----------------|-------|----------------|
| 6 | `RESEND_API_KEY` (+ `EMAIL_FROM`, `EMAIL_ADMIN_INBOX`) | Resend API key + verified sender | Backend env | Order received / confirmed / shipped / delivered / cancelled / payment-verified emails. Without it the store works; every email attempt is recorded in `EmailLog` as `skipped` and the server logs that email is unavailable. |
| 7 | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary account credentials | Backend env | Product/logo images served from a CDN. Omit **only** when self-hosting on a persistent disk (local fallback keeps files in `backend/uploads` — ephemeral hosts lose them on redeploy). |
| 8 | `MPESA_CALLBACK_URL` + Daraja keys (`MPESA_CONSUMER_KEY/SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`) | Safaricom Daraja credentials + public HTTPS callback | Backend env | Only needed if the owner later wants automated STK Push. Manual Till/Paybill payments work without them. |
| 9 | `NEXT_PUBLIC_API_URL` | Public API origin (split deployments only) | Frontend env | Leave empty when using the same-origin proxy (`BACKEND_API_URL` on the backend host). |

## Pre-launch checklist

1. `NODE_ENV=production`, all required variables set → backend boots (it
   self-refuses otherwise) and `/health` returns `{"status":"ok"}`.
2. Admin → Settings → **Production readiness** card shows no ❌.
3. Owner completes Settings (store profile, payments, delivery zones) and
   changes the setup password when prompted at first login.
4. Admin → Products → add the real catalogue (or AI Product Assistant).
5. Delete any test orders/products/customers before going live.
6. Run one real end-to-end order (Till payment → verify → mark Paid).
