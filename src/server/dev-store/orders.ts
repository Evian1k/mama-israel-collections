import { randomUUID } from "crypto";
import { ApiError } from "@/services/api/client";
import { effectivePrice } from "@/lib/product-utils";
import { getDb } from "./db";
import { generateId, nextOrderNumber } from "./ids";
import type {
  CustomerDetail,
  CustomerSummary,
  Order,
  OrderStatus,
  Paginated,
  PaymentStatus,
  PlaceOrderInput,
} from "@/types";

/**
 * Order repository + customer aggregation for the dev adapter.
 * The server is the single source of truth: prices, totals and stock are
 * recomputed here from the actual products (client values are never trusted).
 */

export interface CreateOrderResult {
  order: Order;
}

export function createOrder(input: PlaceOrderInput): Order {
  const db = getDb();

  if (db.products.length === 0) {
    throw new ApiError(
      "The shop is not accepting orders yet — the collection is being prepared.",
      409,
      "CONFLICT"
    );
  }

  // M-Pesa availability + duplicate-code checks (mirrors the backend rules)
  let mpesaTransactionCode: string | null = null;
  if (input.paymentMethod === "mpesa") {
    const mpesaEnabled = db.settings.payments?.mpesa.enabled ?? false;
    if (!mpesaEnabled || !input.mpesaTransactionCode) {
      throw new ApiError(
        "M-Pesa payments are not available right now. Please choose another payment method or contact us on WhatsApp.",
        409,
        "MPESA_UNAVAILABLE"
      );
    }
    const code = input.mpesaTransactionCode.replace(/\s+/g, "").toUpperCase();
    const duplicate = db.orders.some(
      (o) => (o.mpesaTransactionCode ?? "").toUpperCase() === code
    );
    if (duplicate) {
      throw new ApiError(
        "This M-Pesa transaction code has already been used. Please check your confirmation SMS and try again, or contact us on WhatsApp.",
        409,
        "MPESA_CODE_USED"
      );
    }
    mpesaTransactionCode = code;
  }

  const lines = input.items.map((item, index) => {
    const product = db.products.find((p) => p.id === item.productId);

    if (!product || !product.isActive) {
      throw new ApiError(
        `Item ${index + 1} is no longer available. Please review your cart.`,
        409,
        "PRODUCT_NOT_FOUND"
      );
    }
    if (product.stockQuantity <= 0) {
      throw new ApiError(
        `Sorry — "${product.name}" just went out of stock. Please remove it from your cart.`,
        409,
        "OUT_OF_STOCK"
      );
    }
    if (item.size && product.sizes.length > 0 && !product.sizes.includes(item.size)) {
      throw new ApiError(
        `"${product.name}" is not available in size ${item.size}. Please choose another size.`,
        409,
        "INVALID_VARIANT"
      );
    }
    if (item.color && product.colors.length > 0 && !product.colors.some((c) => c.name === item.color)) {
      throw new ApiError(
        `"${product.name}" is not available in ${item.color}. Please choose another colour.`,
        409,
        "INVALID_VARIANT"
      );
    }
    if (item.quantity > product.stockQuantity) {
      throw new ApiError(
        `Only ${product.stockQuantity} left of "${product.name}". Please adjust the quantity.`,
        409,
        "OUT_OF_STOCK"
      );
    }

    const unitPrice = effectivePrice(product);
    return {
      id: generateId("itm"),
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? null,
      size: item.size,
      color: item.color,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const { delivery } = db.settings;
  let deliveryFee = 0;
  if (delivery.flatFee !== null) {
    deliveryFee = delivery.flatFee;
    if (delivery.freeAboveThreshold !== null && subtotal >= delivery.freeAboveThreshold) {
      deliveryFee = 0;
    }
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    orderNumber: nextOrderNumber(),
    customer: {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email,
      deliveryLocation: input.customer.deliveryLocation,
      notes: input.customer.notes,
    },
    items: lines,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMethod: input.paymentMethod ?? "pay_on_delivery",
    // Manual M-Pesa: the submitted code starts as "Awaiting verification"
    paymentStatus: input.paymentMethod === "mpesa" ? "pending" : "unpaid",
    mpesaTransactionCode,
    status: "pending",
    statusHistory: [{ status: "pending", at: now }],
    createdAt: now,
    updatedAt: now,
  };

  // Reduce stock — dev adapter does this synchronously with order creation
  for (const line of lines) {
    const product = db.products.find((p) => p.id === line.productId);
    if (product) {
      product.stockQuantity = Math.max(0, product.stockQuantity - line.quantity);
      product.updatedAt = now;
    }
  }

  db.orders.unshift(order);
  return order;
}

export function getOrderByNumber(orderNumber: string): Order | null {
  const db = getDb();
  const needle = orderNumber.trim().toUpperCase();
  return db.orders.find((o) => o.orderNumber === needle) ?? null;
}

export function getOrderByIdOrNumber(idOrNumber: string): Order | null {
  const db = getDb();
  const needle = idOrNumber.trim();
  return (
    db.orders.find((o) => o.id === needle || o.orderNumber === needle.toUpperCase()) ?? null
  );
}

export function queryOrders(opts: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}): Paginated<Order> {
  const db = getDb();
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(60, Math.max(1, opts.limit ?? 20));

  let filtered = [...db.orders];

  if (opts.status) filtered = filtered.filter((o) => o.status === opts.status);
  if (opts.paymentStatus) {
    filtered = filtered.filter((o) => o.paymentStatus === opts.paymentStatus);
  }
  if (opts.search) {
    const needle = opts.search.toLowerCase();
    filtered = filtered.filter((o) => {
      const haystack = [
        o.orderNumber,
        o.customer.fullName,
        o.customer.phone,
        o.customer.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string): Order {
  const db = getDb();
  const order = db.orders.find((o) => o.id === id || o.orderNumber === id.toUpperCase());
  if (!order) {
    throw new ApiError("Order not found.", 404, "ORDER_NOT_FOUND");
  }
  if (order.status !== status) {
    order.status = status;
    order.statusHistory.push({ status, at: new Date().toISOString(), note });
    order.updatedAt = new Date().toISOString();
  }
  return order;
}

/**
 * POST /api/admin/orders/:id/payment-status — audited payment verification.
 * `note` is accepted for parity with the backend (which stores the audit
 * entry); the in-memory adapter does not persist it.
 */
export function setOrderPaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
  _note?: string
): Order {
  const db = getDb();
  const order = db.orders.find((o) => o.id === id || o.orderNumber === id.toUpperCase());
  if (!order) {
    throw new ApiError("Order not found.", 404, "ORDER_NOT_FOUND");
  }
  order.paymentStatus = paymentStatus;
  order.updatedAt = new Date().toISOString();
  return order;
}

/** Customers are aggregated from orders (no accounts in Phase 1) */
export function listCustomers(): CustomerSummary[] {
  const db = getDb();
  const map = new Map<string, CustomerSummary>();

  for (const order of db.orders) {
    if (order.status === "cancelled") continue;
    const key = order.customer.phone;
    const existing = map.get(key);
    const createdAt = order.createdAt;
    if (!existing) {
      map.set(key, {
        id: key,
        fullName: order.customer.fullName,
        phone: order.customer.phone,
        email: order.customer.email,
        ordersCount: 1,
        totalSpent: order.total,
        firstOrderAt: createdAt,
        lastOrderAt: createdAt,
        deliveryLocations: [order.customer.deliveryLocation],
      });
    } else {
      existing.ordersCount += 1;
      existing.totalSpent += order.total;
      existing.email = existing.email ?? order.customer.email;
      if (existing.lastOrderAt && createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = createdAt;
        existing.fullName = order.customer.fullName;
      }
      if (!existing.firstOrderAt || createdAt < existing.firstOrderAt) {
        existing.firstOrderAt = createdAt;
      }
      if (!existing.deliveryLocations.includes(order.customer.deliveryLocation)) {
        existing.deliveryLocations.push(order.customer.deliveryLocation);
      }
    }
  }

  return [...map.values()].sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));
}

export function getCustomerDetail(id: string): CustomerDetail | null {
  const db = getDb();
  const summary = listCustomers().find((c) => c.id === id);
  if (!summary) return null;
  const orders = db.orders
    .filter((o) => o.customer.phone === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...summary, orders };
}
