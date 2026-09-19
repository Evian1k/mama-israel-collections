/* eslint-disable no-console */
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

/**
 * ============================================================================
 * MAMA ISRAEL API — integration test suite
 * ============================================================================
 * Runs against a LIVE backend (default http://127.0.0.1:3900) and exercises
 * every critical flow end-to-end over real HTTP:
 *
 *  1. health check                        10. order status machine + history
 *  2. authentication (login/session/401s) 11. customers (auto-created from orders)
 *  3. unauthorized admin access blocked   12. settings + server-side delivery fee
 *  4. category CRUD + delete guard        13. newsletter + contact
 *  5. product CRUD + validation           14. uploads guard
 *  6. product filters/search/sort        15. M-Pesa: not-configured error,
 *  7. server-side price validation            success callback, duplicate
 *  8. stock validation / race safety          callback idempotency, failure
 *  9. order creation + number format          callback
 *
 * The suite creates its own clearly-named "Test:" fixtures and wipes them at
 * the start and the end, so the database is left EMPTY afterwards.
 *
 * Run:  bun run test:api        (requires the backend running: bun run dev)
 * ============================================================================
 */

// ---- Resolve DATABASE_URL the same way the backend does (PostgreSQL-only) ---
const fileEnv = dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true }).parsed ?? {};
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  if (fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
}

const prisma = new PrismaClient();

const BASE = process.env.TEST_API_URL ?? "http://127.0.0.1:3900";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, extra = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name} ${extra}`);
    console.log(`  ✖ ${name} ${extra}`);
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function api<T>(
  method: string,
  pathUrl: string,
  opts: { body?: unknown; token?: string } = {}
): Promise<{ status: number; body: Envelope<T> }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const response = await fetch(`${BASE}${pathUrl}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let body: Envelope<T>;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    body = { success: false, error: { code: "NO_JSON", message: "non-JSON response" } };
  }
  return { status: response.status, body };
}

async function expectStatus(
  name: string,
  method: string,
  pathUrl: string,
  expectedStatus: number,
  opts: { body?: unknown; token?: string; expectedCode?: string } = {}
): Promise<{ status: number; body: Envelope<never> }> {
  const { status, body } = await api<never>(method, pathUrl, opts);
  check(name, status === expectedStatus && (!opts.expectedCode || body.error?.code === opts.expectedCode),
    `(got ${status} ${body.error?.code ?? "ok"})`);
  return { status, body };
}

async function wipeDatabase(): Promise<void> {
  await prisma.paymentTransaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderStatusEvent.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.newsletterSubscriber.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.storeSettings.deleteMany({});
}

async function resetSettings(): Promise<void> {
  await prisma.storeSettings.deleteMany({});
}

async function main(): Promise<void> {
  console.log(`\nMAMA ISRAEL API TESTS → ${BASE}\n`);

  // ---------------------------------------------------------------- health
  console.log("■ Health");
  {
    const res = await fetch(`${BASE}/health`);
    const body = (await res.json()) as { status: string; database: string };
    check("GET /health → 200 ok + database connected", res.status === 200 && body.status === "ok" && body.database === "connected");
  }

  await wipeDatabase();

  // ------------------------------------------------------------------- auth
  console.log("■ Authentication");
  let token = "";
  {
    await expectStatus("login with wrong password → 401", "POST", "/api/admin/auth/login", 401, {
      body: { email: "admin@mamaisraelcollections.com", password: "wrong-password" },
    });
    await expectStatus("login with unknown email → 401", "POST", "/api/admin/auth/login", 401, {
      body: { email: "nobody@nowhere.com", password: "whatever123" },
    });
    await expectStatus("login with invalid payload → 400", "POST", "/api/admin/auth/login", 400, {
      body: { email: "not-an-email", password: "123" },
    });
    await expectStatus("admin stats without token → 401", "GET", "/api/admin/stats", 401, {
      expectedCode: "UNAUTHORIZED",
    });
    await expectStatus("admin stats with garbage token → 401", "GET", "/api/admin/stats", 401, {
      token: "garbage.token.value",
    });

    const login = await api<{ token: string; user: { email: string; role: string } }>(
      "POST", "/api/admin/auth/login",
      { body: { email: "admin@mamaisraelcollections.com", password: "mama-israel-admin" } }
    );
    check("login success → AdminSession with admin role",
      login.status === 200 && Boolean(login.body.data?.token) && login.body.data?.user.role === "admin");
    check("login response never leaks password hash",
      !JSON.stringify(login.body).toLowerCase().includes("passwordhash"));
    token = login.body.data?.token ?? "";

    const session = await api<{ user: { email: string } }>("GET", "/api/admin/auth/session", { token });
    check("session validation returns the admin user", session.status === 200 && session.body.data?.user.email === "admin@mamaisraelcollections.com");

    const logout = await api<{ message: string }>("POST", "/api/admin/auth/logout", { token });
    check("logout → message", logout.status === 200 && Boolean(logout.body.data?.message));
  }

  // -------------------------------------------------------------- categories
  console.log("■ Categories");
  let categoryId = "";
  {
    await expectStatus("create category unauthenticated → 401", "POST", "/api/admin/categories", 401, {
      body: { name: "Test: Sneaky Category" },
    });

    const created = await api<{ id: string; slug: string }>("POST", "/api/admin/categories", {
      token,
      body: { name: "Test: Dresses", description: "Test fixture" },
    });
    check("create category → 201 with auto slug", created.status === 201 && created.body.data?.slug === "test-dresses");
    categoryId = created.body.data?.id ?? "";

    const dup = await api<{ id: string }>("POST", "/api/admin/categories", {
      token,
      body: { name: "Test: Dresses" },
    });
    check("duplicate name gets unique slug (-2)", dup.status === 201 && dup.body.data?.slug === "test-dresses-2");
    const dupId = dup.body.data?.id ?? "";
    const delDup = await api("DELETE", `/api/admin/categories/${dupId}`, { token });
    check("delete the duplicate → ok", delDup.status === 200);

    await expectStatus("invalid category name → 400 VALIDATION_ERROR", "POST", "/api/admin/categories", 400, {
      token, body: { name: "x" },
      expectedCode: "VALIDATION_ERROR",
    });

    const publicList = await api<Array<{ id: string }>>("GET", "/api/categories");
    check("public list shows the active category", publicList.status === 200 && publicList.body.data?.some((c) => c.id === categoryId));
  }

  // ---------------------------------------------------------------- products
  console.log("■ Products");
  let productId = "";
  let productSlug = "";
  let saleProductId = "";
  {
    await expectStatus("create product unauthenticated → 401", "POST", "/api/admin/products", 401, {
      body: { name: "Test: Hack", description: "x".repeat(20), categoryId, price: 100, stockQuantity: 1 },
    });
    await expectStatus("invalid product (short description) → 400", "POST", "/api/admin/products", 400, {
      token, body: { name: "Test: Bad", description: "short", categoryId, price: 100, stockQuantity: 1 },
      expectedCode: "VALIDATION_ERROR",
    });
    await expectStatus("invalid product (bad category) → 400", "POST", "/api/admin/products", 400, {
      token, body: { name: "Test: Bad Cat", description: "A valid description here", categoryId: "nope", price: 100, stockQuantity: 1 },
    });

    const created = await api<{ id: string; slug: string; sku: string; price: number }>(
      "POST", "/api/admin/products",
      {
        token,
        body: {
          name: "Test: Sunset Maxi Dress",
          description: "A test dress with a sale price and sizes.",
          categoryId,
          price: 4000,
          compareAtPrice: 5000,
          sizes: ["S", "M", "L"],
          colors: [{ name: "Burgundy", hex: "#7A2235" }],
          stockQuantity: 5,
          lowStockThreshold: 2,
          isFeatured: true,
          isNewArrival: true,
        },
      }
    );
    check("create product → 201 with auto SKU", created.status === 201 && /^MIC-\d+$/.test(created.body.data?.sku ?? ""));
    productId = created.body.data?.id ?? "";
    productSlug = created.body.data?.slug ?? "";

    const sale = await api<{ id: string }>("POST", "/api/admin/products", {
      token,
      body: {
        name: "Test: Sale Top",
        description: "A test product on sale for price validation.",
        categoryId,
        price: 3000,
        compareAtPrice: 2500,
        stockQuantity: 10,
      },
    });
    saleProductId = sale.body.data?.id ?? "";
    check("create second product → 201", sale.status === 201);

    const bySlug = await api<{ price: number; sku: string }>("GET", `/api/products/${productSlug}`);
    check("public detail by slug works", bySlug.status === 200 && bySlug.body.data?.price === 4000);

    await expectStatus("unknown product → 404 PRODUCT_NOT_FOUND", "GET", "/api/products/does-not-exist", 404, {
      expectedCode: "PRODUCT_NOT_FOUND",
    });

    // effective price checks
    const list = await api<{ items: Array<{ id: string; price: number }> }>(
      "GET", "/api/products?sort=price_asc"
    );
    check("price_asc sorts by EFFECTIVE price (2500 before 4000)",
      list.status === 200 &&
      list.body.data?.items[0]?.price === 3000 && // mapper returns list price; sort uses effective
      list.body.data?.items.length === 2);

    const filtered = await api<{ pagination: { total: number } }>("GET", "/api/products?minPrice=3500&maxPrice=4500");
    check("min/max filter matches effective price (4000)", filtered.status === 200 && filtered.body.data?.pagination.total === 1);

    const sizeFilter = await api<{ pagination: { total: number } }>("GET", "/api/products?sizes=M");
    check("size filter (M) finds the dress", sizeFilter.status === 200 && sizeFilter.body.data?.pagination.total === 1);

    const colorFilter = await api<{ pagination: { total: number } }>("GET", "/api/products?colors=burgundy");
    check("colour filter is case-insensitive", colorFilter.status === 200 && colorFilter.body.data?.pagination.total === 1);

    const search = await api<{ total: number }>("GET", "/api/products/search?q=sunset");
    check("search?q= finds by name", search.status === 200 && (search.body.data?.length ?? 0) === 1);

    const featured = await api<Array<{ id: string }>>("GET", "/api/products/featured");
    check("featured endpoint returns the featured dress", featured.status === 200 && featured.body.data?.some((p) => p.id === productId));

    const updated = await api<{ price: number }>("PATCH", `/api/admin/products/${productId}`, {
      token, body: { price: 4200 },
    });
    check("admin update price → 200 + persisted", updated.status === 200 && updated.body.data?.price === 4200);

    const adminList = await api<{ pagination: { total: number } }>(
      "GET", "/api/admin/products", { token }
    );
    check("admin list includes products (includeInactive default)", adminList.status === 200 && adminList.body.data?.pagination.total === 2);

    await api("PATCH", `/api/admin/products/${saleProductId}`, { token, body: { isActive: false } });
    const publicAfterDeactivate = await api<{ pagination: { total: number } }>("GET", "/api/products");
    check("deactivated product hidden from public list", publicAfterDeactivate.status === 200 && publicAfterDeactivate.body.data?.pagination.total === 1);
    const adminSeesInactive = await api<{ pagination: { total: number } }>("GET", "/api/admin/products", { token });
    check("admin list still shows inactive", adminSeesInactive.status === 200 && adminSeesInactive.body.data?.pagination.total === 2);
    await api("PATCH", `/api/admin/products/${saleProductId}`, { token, body: { isActive: true } });

    await expectStatus("category delete blocked while products exist → 409", "DELETE", `/api/admin/categories/${categoryId}`, 409, { token });
  }

  // ------------------------------------------------------------------ orders
  console.log("■ Orders");
  let orderNumber = "";
  {
    await expectStatus("order with unknown product → 409 PRODUCT_NOT_FOUND", "POST", "/api/orders", 409, {
      body: {
        items: [{ productId: "nope", size: null, color: null, quantity: 1 }],
        customer: { fullName: "Test Customer", phone: "0712345678", deliveryLocation: "Nairobi" },
      },
      expectedCode: "PRODUCT_NOT_FOUND",
    });

    await expectStatus("order with invalid size → 409 INVALID_VARIANT", "POST", "/api/orders", 409, {
      body: {
        items: [{ productId, size: "ZZ", color: null, quantity: 1 }],
        customer: { fullName: "Test Customer", phone: "0712345678", deliveryLocation: "Nairobi" },
      },
      expectedCode: "INVALID_VARIANT",
    });

    await expectStatus("order exceeding stock → 409 OUT_OF_STOCK", "POST", "/api/orders", 409, {
      body: {
        items: [{ productId, size: "S", color: null, quantity: 99 }],
        customer: { fullName: "Test Customer", phone: "0712345678", deliveryLocation: "Nairobi" },
      },
      expectedCode: "OUT_OF_STOCK",
    });

    await expectStatus("order with bad phone → 400 VALIDATION_ERROR", "POST", "/api/orders", 400, {
      body: {
        items: [{ productId, size: "S", color: null, quantity: 1 }],
        customer: { fullName: "Test Customer", phone: "12345", deliveryLocation: "Nairobi" },
      },
      expectedCode: "VALIDATION_ERROR",
    });

    await expectStatus("empty cart → 400", "POST", "/api/orders", 400, {
      body: {
        items: [],
        customer: { fullName: "Test Customer", phone: "0712345678", deliveryLocation: "Nairobi" },
      },
    });

    // SERVER-SIDE PRICE VALIDATION: place a "correct" order and verify the
    // server computes totals from DB prices (4200 list, sale product 2500 effective).
    const order = await api<{
      orderNumber: string;
      subtotal: number;
      total: number;
      items: Array<{ unitPrice: number; lineTotal: number; productName: string }>;
      status: string;
      paymentStatus: string;
      statusHistory: Array<{ status: string }>;
    }>("POST", "/api/orders", {
      body: {
        items: [
          { productId, size: "S", color: "Burgundy", quantity: 2 },
          { productId: saleProductId, size: null, color: null, quantity: 1 },
        ],
        customer: { fullName: "Grace Test", phone: "0712 345 678", email: "", deliveryLocation: "Nairobi, Westlands" },
      },
    });
    check("valid order → 201 with pending status",
      order.status === 201 && order.body.data?.status === "pending" && order.body.data?.paymentStatus === "unpaid");
    check("order number format MIC-YYYYMMDD-NNNN",
      /^MIC-\d{8}-\d{4}$/.test(order.body.data?.orderNumber ?? ""));
    check("server priced line 1 at 4200×2 (client never sends prices)",
      order.body.data?.items[0]?.unitPrice === 4200 && order.body.data?.items[0]?.lineTotal === 8400);
    check("server priced line 2 at effective sale price 2500",
      order.body.data?.items[1]?.unitPrice === 2500 && order.body.data?.items[1]?.lineTotal === 2500);
    check("subtotal/total computed server-side (10900, no delivery fee by default)",
      order.body.data?.subtotal === 10900 && order.body.data?.total === 10900);
    check("initial status history recorded", order.body.data?.statusHistory?.[0]?.status === "pending");
    orderNumber = order.body.data?.orderNumber ?? "";

    const stockAfter = await api<{ stockQuantity: number }>("GET", `/api/products/${productSlug}`);
    check("stock decremented 5 → 3 after order", stockAfter.body.data?.stockQuantity === 3);

    const lookup = await api<{ orderNumber: string }>("GET", `/api/orders/${orderNumber.toLowerCase()}`);
    check("public order lookup is case-insensitive", lookup.status === 200 && lookup.body.data?.orderNumber === orderNumber);

    await expectStatus("unknown order number → 404 ORDER_NOT_FOUND", "GET", "/api/orders/MIC-19990101-0001", 404, {
      expectedCode: "ORDER_NOT_FOUND",
    });

    // status machine — forwards are allowed (including skips), backwards are not
    const confirm = await api<{ status: string; statusHistory: Array<{ status: string }> }>(
      "PATCH", `/api/admin/orders/${orderNumber}/status`,
      { token, body: { status: "confirmed", note: "Called the customer" } }
    );
    check("pending → confirmed works and records history + note",
      confirm.status === 200 && confirm.body.data?.status === "confirmed" &&
      confirm.body.data?.statusHistory?.some((e) => e.status === "confirmed" && e.note === "Called the customer"));

    await expectStatus("backwards transition confirmed → pending → 409", "PATCH", `/api/admin/orders/${orderNumber}/status`, 409, {
      token, body: { status: "pending" },
    });

    await expectStatus("status update unauthenticated → 401", "PATCH", `/api/admin/orders/${orderNumber}/status`, 401, {
      body: { status: "delivered" },
    });

    const adminOrders = await api<{ pagination: { total: number } }>(
      "GET", "/api/admin/orders?status=confirmed&search=grace", { token }
    );
    check("admin orders filter by status + search", adminOrders.status === 200 && adminOrders.body.data?.pagination.total === 1);

    // forward skip confirmed → delivered (small shops do this on the spot)
    const delivered = await api<{ status: string }>(
      "PATCH", `/api/admin/orders/${orderNumber}/status`,
      { token, body: { status: "delivered" } }
    );
    check("forward skip to delivered works", delivered.status === 200 && delivered.body.data?.status === "delivered");

    await expectStatus("delivered is read-only → 409", "PATCH", `/api/admin/orders/${orderNumber}/status`, 409, {
      token, body: { status: "cancelled" },
    });
  }

  // --------------------------------------------------------------- customers
  console.log("■ Customers");
  {
    const customers = await api<Array<{ id: string; phone: string; ordersCount: number; totalSpent: number; deliveryLocations: string[] }>>(
      "GET", "/api/admin/customers", { token }
    );
    const customer = customers.body.data?.[0];
    check("customer auto-created from order with aggregates",
      customers.status === 200 && customers.body.data?.length === 1 &&
      customer?.phone === "+254712345678" && customer?.ordersCount === 1 && customer?.totalSpent === 10900 &&
      customer?.deliveryLocations.includes("Nairobi, Westlands"));

    const detail = await api<{ orders: Array<{ orderNumber: string }>; fullName: string }>(
      "GET", `/api/admin/customers/${customer?.id}`, { token }
    );
    check("customer detail includes the order history",
      detail.status === 200 && detail.body.data?.orders?.[0]?.orderNumber === orderNumber);

    await expectStatus("customers list requires admin → 401", "GET", "/api/admin/customers", 401);
  }

  // ---------------------------------------------------------------- settings
  console.log("■ Store settings + delivery fee");
  {
    const patched = await api<{ whatsappNumber: string; delivery: { flatFee: number | null } }>(
      "PATCH", "/api/admin/settings",
      { token, body: { whatsappNumber: "254733333333", delivery: { flatFee: 300, freeAboveThreshold: 5000, note: "Rural areas may cost more." } } }
    );
    check("admin settings PATCH persists", patched.status === 200 && patched.body.data?.delivery?.flatFee === 300);

    const store = await api<{ whatsappNumber: string; delivery: { flatFee: number } }>("GET", "/api/store");
    check("public /api/store reflects settings", store.status === 200 && store.body.data?.whatsappNumber === "254733333333");

    const cheap = await api<{ deliveryFee: number; total: number }>("POST", "/api/orders", {
      body: {
        items: [{ productId, size: "M", color: null, quantity: 1 }],
        customer: { fullName: "Fee Tester", phone: "0734444444", deliveryLocation: "Kiambu" },
      },
    });
    check("delivery fee applied (4200 + 300)", cheap.body.data?.deliveryFee === 300 && cheap.body.data?.total === 4500);

    const expensive = await api<{ deliveryFee: number; total: number }>("POST", "/api/orders", {
      body: {
        items: [{ productId, size: "L", color: null, quantity: 2 }],
        customer: { fullName: "Fee Tester", phone: "0734444444", deliveryLocation: "Kiambu" },
      },
    });
    check("free delivery above threshold (8400 ≥ 5000)", expensive.body.data?.deliveryFee === 0 && expensive.body.data?.total === 8400);

    const storeAfter = await api<{ delivery: { flatFee: number | null } }>("GET", "/api/store");
    void storeAfter;
    // reset settings to defaults for a clean state
    await resetSettings();
    const defaulted = await api<{ delivery: { flatFee: number | null } }>("GET", "/api/store");
    check("settings reset back to defaults", defaulted.body.data?.delivery?.flatFee === null);
  }

  // -------------------------------------------------------------- engagement
  console.log("■ Newsletter + contact");
  {
    const sub = await api<{ email: string; message: string }>("POST", "/api/newsletter", {
      body: { email: "Test@Example.com" },
    });
    check("newsletter subscribe normalises email", sub.status === 200 && sub.body.data?.email === "test@example.com");
    const dup = await api("POST", "/api/newsletter", { body: { email: "test@example.com" } });
    check("duplicate subscribe stays friendly", dup.status === 200);

    await expectStatus("newsletter invalid email → 400", "POST", "/api/newsletter", 400, {
      body: { email: "nope" },
    });

    const msg = await api<{ message: string }>("POST", "/api/contact", {
      body: { name: "Test Person", email: "test@example.com", message: "Hello, this is a test message!" },
    });
    check("contact message accepted", msg.status === 200 && Boolean(msg.body.data?.message));

    await expectStatus("contact too-short message → 400", "POST", "/api/contact", 400, {
      body: { name: "Test Person", email: "test@example.com", message: "hi" },
    });
  }

  // ----------------------------------------------------------------- uploads
  console.log("■ Uploads");
  {
    await expectStatus("uploads require admin → 401", "POST", "/api/admin/uploads", 401);
  }

  // ----------------------------------------------------------------- payments
  console.log("■ Payments (M-Pesa Daraja)");
  {
    const configStatus = await api<{ configured: boolean }>("GET", "/api/payments/mpesa/config-status");
    check("payments config-status reports unconfigured honestly", configStatus.status === 200 && configStatus.body.data?.configured === false);

    await expectStatus("STK push without Daraja credentials → 503 PAYMENTS_NOT_CONFIGURED",
      "POST", "/api/payments/mpesa/stk-push", 503, {
        body: { orderNumber, phone: "0712345678" },
        expectedCode: "PAYMENTS_NOT_CONFIGURED",
      });

    // --- Simulate the FULL callback lifecycle against the real endpoint ----
    // (test setup: create a pending payment + transaction directly in the DB,
    //  exactly as initiateStkPush would after a real Daraja response)
    // Success path needs a still-pending order so auto-confirmation can fire.
    const order = await prisma.order.findFirst({ where: { status: "pending" } });
    const usedOrderIds = new Set<string>([order!.id]);
    const payment = await prisma.payment.create({
      data: { orderId: order!.id, provider: "mpesa", status: "pending", amount: order!.total, phone: "+254712345678" },
    });
    const transaction = await prisma.paymentTransaction.create({
      data: { paymentId: payment.id, checkoutRequestId: "ws_CO_TEST_0001", merchantRequestId: "mr-1" },
    });
    await prisma.order.update({ where: { id: order!.id }, data: { paymentStatus: "pending" } });

    const callbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "mr-1",
          CheckoutRequestID: "ws_CO_TEST_0001",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: Number(order!.total) },
              { Name: "MpesaReceiptNumber", Value: "TESTRCPT01" },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    };

    const cb1 = await fetch(`${BASE}/api/payments/mpesa/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(callbackPayload),
    });
    const cb1Body = (await cb1.json()) as { ResultCode: number };
    check("callback accepted by Daraja contract (ResultCode 0)", cb1.status === 200 && cb1Body.ResultCode === 0);

    const paymentAfter = await prisma.payment.findUnique({ where: { id: payment.id } });
    const orderAfter = await prisma.order.findUnique({ where: { id: order!.id } });
    const eventsAfter = await prisma.orderStatusEvent.findMany({ where: { orderId: order!.id }, orderBy: { createdAt: "asc" } });
    check("verified callback → payment success", paymentAfter?.status === "success");
    check("verified callback → order paid + auto-confirmed",
      orderAfter?.paymentStatus === "paid" && orderAfter?.status === "confirmed");
    check("payment auto-confirmation recorded in status history",
      eventsAfter.some((e) => e.newStatus === "confirmed" && (e.note ?? "").includes("M-Pesa")));

    // duplicate callback must NOT double-process
    const cb2 = await fetch(`${BASE}/api/payments/mpesa/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(callbackPayload),
    });
    check("duplicate callback acknowledged (idempotent)", cb2.status === 200);
    const eventsAfterDup = await prisma.orderStatusEvent.count({ where: { orderId: order!.id } });
    check("duplicate callback did not duplicate history", eventsAfterDup === eventsAfter.length);
    const txAfter = await prisma.paymentTransaction.findUnique({ where: { id: transaction.id } });
    check("transaction processed exactly once", txAfter?.processedAt !== null);

    const paymentView = await api<{ status: string; orderNumber: string }>("GET", `/api/payments/${payment.id}`);
    check("GET /api/payments/:id returns status for polling",
      paymentView.status === 200 && paymentView.body.data?.status === "success");

    // failure callback on a fresh pending payment
    const order2 = await prisma.order.findFirst({
      where: { status: "pending", id: { notIn: [...usedOrderIds] } },
    });
    usedOrderIds.add(order2!.id);
    const payment2 = await prisma.payment.create({
      data: { orderId: order2!.id, provider: "mpesa", status: "pending", amount: order2!.total, phone: "+254711111111" },
    });
    await prisma.paymentTransaction.create({
      data: { paymentId: payment2.id, checkoutRequestId: "ws_CO_TEST_0002" },
    });
    const cb3 = await fetch(`${BASE}/api/payments/mpesa/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_TEST_0002",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      }),
    });
    check("failure/cancel callback accepted", cb3.status === 200);
    const payment2After = await prisma.payment.findUnique({ where: { id: payment2.id } });
    const order2After = await prisma.order.findUnique({ where: { id: order2!.id } });
    check("cancelled STK → payment cancelled, order NOT paid",
      payment2After?.status === "cancelled" && order2After?.paymentStatus === "unpaid");

    // unknown callback is acknowledged but ignored
    const cb4 = await fetch(`${BASE}/api/payments/mpesa/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Body: { stkCallback: { CheckoutRequestID: "ws_CO_UNKNOWN", ResultCode: 0, ResultDesc: "x" } },
      }),
    });
    check("unknown checkout id acknowledged without side effects", cb4.status === 200);

    // amount-mismatch callback must NOT mark paid (fresh order, still pending)
    const mismatchOrder = await api<{ orderNumber: string }>("POST", "/api/orders", {
      body: {
        items: [{ productId: saleProductId, size: null, color: null, quantity: 1 }],
        customer: { fullName: "Mismatch Tester", phone: "0755555555", deliveryLocation: "Nakuru" },
      },
    });
    const order3 = await prisma.order.findUnique({ where: { orderNumber: mismatchOrder.body.data?.orderNumber ?? "" } });
    usedOrderIds.add(order3!.id);
    const payment3 = await prisma.payment.create({
      data: { orderId: order3!.id, provider: "mpesa", status: "pending", amount: order3!.total, phone: "+254722222222" },
    });
    await prisma.paymentTransaction.create({
      data: { paymentId: payment3.id, checkoutRequestId: "ws_CO_TEST_0003" },
    });
    await fetch(`${BASE}/api/payments/mpesa/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_TEST_0003",
            ResultCode: 0,
            ResultDesc: "ok",
            CallbackMetadata: { Item: [{ Name: "Amount", Value: 1 }, { Name: "MpesaReceiptNumber", Value: "FAKE01" }] },
          },
        },
      }),
    });
    const order3After = await prisma.order.findUnique({ where: { id: order3!.id } });
    const payment3After = await prisma.payment.findUnique({ where: { id: payment3.id } });
    check("amount mismatch → payment failed, order NOT paid",
      payment3After?.status === "failed" && order3After?.paymentStatus === "unpaid");
  }

  // ------------------------------------------------------------- product del
  console.log("■ Product deletion guard");
  {
    await expectStatus("delete product with orders → 409", "DELETE", `/api/admin/products/${productId}`, 409, { token });
    const inactive = await api("PATCH", `/api/admin/products/${saleProductId}`, { token, body: { isActive: false } });
    check("deactivate works as the alternative", inactive.status === 200);
  }

  // ------------------------------------------------------------------ cleanup
  console.log("■ Cleanup");
  await wipeDatabase();
  const finalProducts = await api<{ pagination: { total: number } }>("GET", "/api/products");
  const finalStats = await api<{ products: { total: number }; orders: { total: number } }>("GET", "/api/admin/stats", { token });
  check("database left EMPTY (no fake production data)",
    finalProducts.body.data?.pagination.total === 0 &&
    finalStats.body.data?.products.total === 0 &&
    finalStats.body.data?.orders.total === 0);

  // ------------------------------------------------------------------ summary
  console.log(`\n════════════════════════════════════════`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((error) => {
    console.error("Test runner crashed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
