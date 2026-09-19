# DEPLOYMENT — Mama Israel Collections

Architecture:

```
Vercel (Next.js frontend)  ──HTTPS REST──►  Render (Fastify API)  ──Prisma──►  Render PostgreSQL
                                                │
                                       Cloudinary (images) · M-Pesa Daraja (payments)
```

The frontend talks to the backend through **one** environment variable:
`NEXT_PUBLIC_API_URL`. No code changes are needed to deploy.

---

## 1. Backend → Render

1. Push `backend/` as its own repository (e.g. `mama-israel-api`).
2. On Render create a **PostgreSQL** instance (≥ 1GB, daily backups) and copy
   the *Internal Database URL*.
3. Create a **Web Service** from the repo with:

   | Setting | Value |
   |---|---|
   | Runtime | Node 20+ |
   | Build command | `npm install && npm run build` |
   | Start command | `npm run start` (runs `node dist/server.js`) |
   | Health check path | `/health` |
   | Port | respects `process.env.PORT` automatically (do not set) |

4. Add the environment variables listed in `backend/.env.example`
   (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `CLOUDINARY_*`, `MPESA_*`, `NODE_ENV=production`).
   The server refuses to boot in production when `JWT_SECRET`/`FRONTEND_URL`/
   `DATABASE_URL` are missing or unsafe.
5. **Migrations:** the API does not run migrations on boot. Run them from your
   machine or a Render Job against the production database:

   ```bash
   DATABASE_URL="<production-url>" npm run db:deploy   # prisma migrate deploy
   ```

   Never use `prisma db push` in production. Never seed production — it must
   start empty; the owner adds real data via the admin UI.
6. First boot auto-creates the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   (bcrypt-hashed). Rotate the env vars afterwards; existing accounts are never
   modified automatically.
7. The server listens on `0.0.0.0:$PORT` — Render-compatible out of the box.

## 2. Frontend → Vercel

1. Import the Next.js repository into Vercel (framework auto-detected).
2. Environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-app>.onrender.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` |
   | `NEXT_PUBLIC_WHATSAPP_NUMBER` | optional default; the owner normally sets this in Admin → Settings |

   Do **not** set `BACKEND_PROXY_URL` (sandbox-only) or
   `NEXT_PUBLIC_ENABLE_DEV_TOOLS` on Vercel.
3. Deploy. All storefront + admin traffic now flows through the service layer
   (`src/services/api/*`) to the Render backend.

## 3. Image storage → Cloudinary

1. Create a Cloudinary account; note cloud name, API key, API secret.
2. Set `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` on the backend.
3. Uploads go to the `mama-israel/products` folder; only the secure URL is
   stored in PostgreSQL. Secrets never reach the browser.
4. `next.config.ts` already allowlists `res.cloudinary.com` for `next/image`.

> The backend's local `uploads/` folder is a development fallback only.
> Render disks are ephemeral — never rely on it in production.

## 4. Payments → M-Pesa Daraja

1. Create a Daraja app (sandbox first): set `MPESA_ENV=sandbox`, then
   `production` after Go-live approval.
2. Set `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
   `MPESA_PASSKEY`.
3. Set `MPESA_CALLBACK_URL=https://<your-render-app>.onrender.com/api/payments/mpesa/callback`
   (must be public HTTPS).
4. Verify with a real sandbox STK push and confirm the callback reconciles the
   payment. **Do not enable M-Pesa at checkout until a real callback has been
   observed end-to-end.**

## 5. Post-deploy checklist

- [ ] `GET /health` returns `{ status: "ok", database: "connected" }`
- [ ] Admin login works with the bootstrap credentials, then they are rotated
- [ ] Category + product created from the admin UI (image visible on the storefront)
- [ ] Test order placed with pay-on-delivery; stock decremented; status flow works
- [ ] CORS: browser console shows no blocked requests from the Vercel domain
- [ ] M-Pesa sandbox STK push + callback verified (before enabling online payment)
- [ ] Render log drain / uptime monitor on `/health`
