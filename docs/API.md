# API REFERENCE — Mama Israel Collections Backend

Base URL (production): `https://<your-render-app>.onrender.com`
Local development: `http://127.0.0.1:3900` (the Next.js dev server proxies
`/api/*` and `/uploads/*` to it when `BACKEND_PROXY_URL` is set).

Every response uses the shared envelope:

```json
{ "success": true, "data": { … } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ] } }
```

Admin endpoints require `Authorization: Bearer <token>` from
`POST /api/admin/auth/login`. Codes the frontend maps to friendly copy:
`VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `ORDER_NOT_FOUND`,
`OUT_OF_STOCK`, `INVALID_VARIANT`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`,
`RATE_LIMITED`, `INTERNAL_ERROR`.

---

## Public endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status: "ok", database: "connected" }` (503 when DB down) |
| GET | `/api/store` | `StoreSettings` (business profile, delivery rules, WhatsApp) |
| GET | `/api/categories` | Active categories with `productCount`. `?includeInactive=true` requires admin |
| GET | `/api/products` | Filters: `page, limit, search, categoryId, categorySlug, minPrice, maxPrice, sizes, colors, sort (newest\|price_asc\|price_desc\|name_asc\|featured), featured, newArrival, inStock`. Price filters and `price_asc/desc` use the **effective** (sale) price. Returns `Paginated<Product>` |
| GET | `/api/products/featured?limit=` | Active + featured, newest first |
| GET | `/api/products/new-arrivals?limit=` | Active + new arrivals, newest first |
| GET | `/api/products/search?q=&limit=` | Name/description/SKO search (ILIKE, trigram-indexed) |
| GET | `/api/products/:slug` | By slug **or** id — active products only (404 otherwise) |
| POST | `/api/orders` | Place order (see below). Rate-limited |
| GET | `/api/orders/:orderNumber` | Public order-status lookup (case-insensitive). Rate-limited |
| POST | `/api/newsletter` | `{ email }` — idempotent upsert |
| POST | `/api/contact` | `{ name, email, phone?, message }` |
| POST | `/api/payments/mpesa/stk-push` | `{ orderNumber, phone }` — initiates Daraja STK push. 503 `PAYMENTS_NOT_CONFIGURED` when Daraja env vars are missing |
| POST | `/api/payments/mpesa/callback` | Daraja → backend. Always `200 { ResultCode: 0 }`. Idempotent |
| GET | `/api/payments/:id` | Minimal payment status for polling (`status`, `amount`, `orderNumber`, `receipt`) |
| GET | `/api/payments/mpesa/config-status` | `{ configured, environment, callbackConfigured }` |
| GET | `/uploads/*` | Dev-fallback image files (production uses Cloudinary URLs directly) |

### Order placement — the server is authoritative

The browser sends **only** product ids, variant selections and quantities:

```json
{
  "items": [{ "productId": "…", "size": "M", "color": "Burgundy", "quantity": 2 }],
  "customer": { "fullName": "…", "phone": "0712 345 678", "email": "", "deliveryLocation": "Nairobi", "notes": "" },
  "paymentMethod": "pay_on_delivery"
}
```

The backend then: validates each product is active → validates the size/colour
against the catalogue (or per-variant stock) → validates stock → **recomputes
unit prices, subtotal, delivery fee and total from the database** → creates the
order + items + status history inside a transaction with atomic conditional
stock decrements (`UPDATE … WHERE stock >= qty` — race-safe, no negative stock)
→ upserts the customer by normalised Kenyan phone (`+2547XXXXXXXX`) → records a
delivery-address history entry.

Order numbers are human-friendly: `MIC-YYYYMMDD-NNNN` (daily sequence, Africa/Nairobi).
Failure codes mirror the frontend handlers: `PRODUCT_NOT_FOUND`, `INVALID_VARIANT`,
`OUT_OF_STOCK` (409) and `VALIDATION_ERROR` (400).

---

## Admin endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/auth/login` | `{ email, password }` → `{ token, user }` (bcrypt, JWT). Rate-limited |
| GET | `/api/admin/auth/session` | Validates the Bearer token → `AdminSession` |
| POST | `/api/admin/auth/logout` | Acknowledges sign-out (JWT is discarded client-side) |
| GET | `/api/admin/products` | Same filters as public + `includeInactive` (defaults true) |
| GET | `/api/admin/products/:id` | By id or slug (includes inactive) |
| POST | `/api/admin/products` | Create. Category must exist; slug/SKU auto-generated when omitted. Optional `variants: [{ size, color, stock, sku }]` (when present they own per-combo stock and `stockQuantity` becomes the aggregate) |
| PATCH | `/api/admin/products/:id` | Partial update. Passing `images` replaces them (removed files are cleaned from storage when no order snapshot references them). Passing `variants` replaces them |
| DELETE | `/api/admin/products/:id` | Blocked with 409 when the product has orders (deactivate instead) |
| GET | `/api/admin/categories` | All categories |
| POST | `/api/admin/categories` | Create |
| PATCH | `/api/admin/categories/:id` | Update |
| DELETE | `/api/admin/categories/:id` | Blocked with 409 while products exist |
| GET | `/api/admin/orders` | Filters: `page, limit, status, paymentStatus, search` (order number/name/phone/email) |
| GET | `/api/admin/orders/:id` | By id **or** order number |
| PATCH | `/api/admin/orders/:id/status` | `{ status, note? }` — enforced transition machine (forwards allowed incl. skips, backwards 409, delivered/cancelled terminal). Writes `OrderStatusEvent` with `previousStatus`, `changedBy` (admin email) |
| PATCH | `/api/admin/orders/:id` | `{ paymentStatus }` — admin override (unpaid/pending/paid/refunded) |
| GET | `/api/admin/customers` | Aggregated from real orders (`ordersCount`, `totalSpent`, `deliveryLocations`). Cancelled-only customers excluded |
| GET | `/api/admin/customers/:id` | Summary + full order history |
| GET | `/api/admin/stats` | Dashboard cards (products, orders by status, revenue, customers, recent orders, low stock) — zeros when empty |
| GET | `/api/admin/analytics` | `?days=1..90` (default 14). Orders/day in Africa/Nairobi, top categories, AOV, fulfilment/cancellation rates, best sellers |
| GET | `/api/admin/settings` | `StoreSettings` |
| PATCH | `/api/admin/settings` | Partial update (name, contacts, WhatsApp, socials, delivery rules, currency) |
| POST | `/api/admin/uploads` | Multipart field `files` (≤10, ≤5MB each, jpg/png/webp/avif) → `{ images: [{ url, filename, size }] }` |

---

## Status machines

**Order status:** `pending → confirmed → processing → ready → shipped → delivered`
(forward, skipping allowed) · any active → `cancelled` · `delivered` and
`cancelled` are terminal. Every change writes a status event.

**Payment status (order):** `unpaid → pending` (STK push sent) `→ paid`
(verified Daraja callback or admin override) · `refunded` (admin only).
M-Pesa transaction states: `pending / success / failed / cancelled`.

**M-Pesa callback security:** success is recorded ONLY when the callback's
`CheckoutRequestID` matches a known pending transaction, its `Amount` equals the
payment amount, and the transaction has not been processed before (unique index
+ `processedAt` guard). The browser can never mark an order paid.
