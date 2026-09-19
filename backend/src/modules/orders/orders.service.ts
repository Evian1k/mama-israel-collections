import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  latestMpesaReceipt,
  mapOrder,
  paginated,
  type DbTx,
} from "../../lib/mappers";
import type { Paginated } from "../../shared/api-types";
import { ApiError } from "../../lib/errors";
import { effectivePrice } from "../../lib/pricing";
import { generateOrderNumber } from "../../lib/order-number";
import { normaliseKePhone } from "../../lib/phone";
import { getSettings, mpesaEffectivelyEnabled } from "../store/store.service";
import { primaryImageUrl } from "../products/products.service";
import {
  sendOrderPlacedEmails,
  sendOrderStatusEmail,
  sendPaymentVerifiedEmail,
} from "../email/email.service";
import { DEFAULT_PAYMENTS } from "../../lib/mappers";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  PlaceOrderInput,
} from "../../shared/api-types";
import { ORDER_STATUSES } from "../../shared/api-types";

/**
 * ============================================================================
 * ORDER SERVICE — the server is the single source of truth.
 * ============================================================================
 * The browser only sends product IDs + variant selections + quantities.
 * Prices, availability, stock, delivery fee and totals are computed HERE from
 * PostgreSQL. Stock decrements use conditional atomic updates inside a
 * transaction (`UPDATE ... WHERE stock >= qty`) so simultaneous checkouts can
 * never oversell.
 *
 * PAYMENTS — the customer-facing flow is MANUAL M-Pesa: the owner configures
 * her Till/Paybill in admin settings, the customer pays DIRECTLY to her and
 * submits the transaction code at checkout. Orders start as paymentStatus
 * "pending" ("Awaiting Verification") and only the owner (audited admin
 * endpoint) or a verified Daraja callback can mark them paid. The website
 * never holds money and nothing is ever auto-paid.
 * ============================================================================
 */

const orderInclude = {
  items: true,
  statusHistory: true,
  payments: { include: { transactions: true } },
} satisfies Prisma.OrderInclude;

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
];

/** Terminal states accept no further transitions. */
function assertTransition(current: OrderStatus, next: OrderStatus): void {
  if (current === next) return; // no-op
  if (current === "cancelled") {
    throw ApiError.conflict("This order was cancelled and can no longer be updated.");
  }
  if (current === "delivered") {
    throw ApiError.conflict("This order is delivered and is read-only.");
  }
  if (next === "cancelled") return; // any active state may be cancelled
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = STATUS_ORDER.indexOf(next);
  if (nextIndex < currentIndex) {
    throw ApiError.conflict(`An order cannot move backwards from "${current}" to "${next}".`);
  }
}

interface ValidatedLine {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantId: string | null;
}

function isOrderNumberCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("orderNumber")
  );
}

const MPESA_CODE_PATTERN = /^[A-Z0-9]{8,15}$/;

/** Normalise a submitted M-Pesa code: trim, uppercase, strip all spaces. */
function normaliseMpesaCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/** Create the order (full pipeline) with retries on order-number collisions. */
export async function createOrder(input: PlaceOrderInput, attempt = 0): Promise<Order> {
  if (attempt > 5) {
    throw ApiError.conflict(
      "We could not complete your order in time. Please try again in a moment.",
      "ORDER_NUMBER_COLLISION"
    );
  }

  const settings = await getSettings();

  // Friendly fast-check that mirrors the Phase 1 behaviour for an empty store.
  const catalogueCount = await prisma.product.count({ where: { isActive: true } });
  if (catalogueCount === 0) {
    throw ApiError.conflict(
      "The shop is not accepting orders yet — the collection is being prepared."
    );
  }

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { variants: true, images: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // ---- Validate every line against the database (client data is ignored) ----
  const lines: ValidatedLine[] = input.items.map((item, index) => {
    const product = byId.get(item.productId);
    if (!product || !product.isActive) {
      throw ApiError.conflict(
        `Item ${index + 1} is no longer available. Please review your cart.`,
        "PRODUCT_NOT_FOUND"
      );
    }

    const hasVariants = product.variants.length > 0;
    let variantId: string | null = null;
    let available: number;

    if (hasVariants) {
      const variant = product.variants.find(
        (v) =>
          (v.size ?? null) === (item.size ?? null) &&
          (v.color ?? null) === (item.color ?? null)
      );
      if (!variant) {
        throw ApiError.conflict(
          `"${product.name}" is not available in that combination. Please choose another option.`,
          "INVALID_VARIANT"
        );
      }
      variantId = variant.id;
      available = variant.stock;
    } else {
      if (item.size && product.sizes.length > 0 && !product.sizes.includes(item.size)) {
        throw ApiError.conflict(
          `"${product.name}" is not available in size ${item.size}. Please choose another size.`,
          "INVALID_VARIANT"
        );
      }
      const productColors = (product.colors ?? []) as { name: string }[];
      if (
        item.color &&
        productColors.length > 0 &&
        !productColors.some((c) => c.name === item.color)
      ) {
        throw ApiError.conflict(
          `"${product.name}" is not available in ${item.color}. Please choose another colour.`,
          "INVALID_VARIANT"
        );
      }
      available = product.stockQuantity;
    }

    if (available <= 0) {
      throw ApiError.conflict(
        `Sorry — "${product.name}" just went out of stock. Please remove it from your cart.`,
        "OUT_OF_STOCK"
      );
    }
    if (item.quantity > available) {
      throw ApiError.conflict(
        `Only ${available} left of "${product.name}". Please adjust the quantity.`,
        "OUT_OF_STOCK"
      );
    }

    const unitPrice = effectivePrice(product);
    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: primaryImageUrl(product.images),
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice,
      lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      variantId,
    };
  });

  const subtotal = Math.round(lines.reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;

  // ---- Delivery fee — computed from store settings on the server ----
  // 1. A named zone matching the normalised delivery location wins.
  // 2. Otherwise the flat fee applies (with the free-above-threshold rule).
  // 3. Otherwise the fee stays 0 — the store shows "delivery to be confirmed".
  const normaliseLocation = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const wantedLocation = normaliseLocation(input.customer.deliveryLocation);
  const matchedZone = wantedLocation
    ? (settings.delivery.zones ?? []).find(
        (zone) => normaliseLocation(zone.name) === wantedLocation
      )
    : undefined;

  let deliveryFee = 0;
  if (matchedZone) {
    deliveryFee = matchedZone.fee;
  } else if (settings.delivery.flatFee !== null) {
    deliveryFee = settings.delivery.flatFee;
    if (
      settings.delivery.freeAboveThreshold !== null &&
      subtotal >= settings.delivery.freeAboveThreshold
    ) {
      deliveryFee = 0;
    }
  }
  const total = subtotal + deliveryFee;

  // ---- Payment method — server-authoritative availability check ----
  // Absent paymentMethod defaults to pay_on_delivery and must STILL pass the
  // availability check (the owner can turn either method off in settings).
  const paymentMethod = input.paymentMethod ?? "pay_on_delivery";
  const paymentsSettings = settings.payments ?? DEFAULT_PAYMENTS;
  if (paymentMethod === "mpesa" && !mpesaEffectivelyEnabled(paymentsSettings)) {
    throw ApiError.validation(
      "M-Pesa payment is not available right now. Please choose another payment method or contact us on WhatsApp."
    );
  }
  if (paymentMethod === "pay_on_delivery" && !paymentsSettings.payOnDeliveryEnabled) {
    throw ApiError.validation(
      "Pay on delivery is not available right now. Please choose another payment method or contact us on WhatsApp."
    );
  }

  // Manual M-Pesa: the transaction code is REQUIRED and normalised
  // (trimmed, uppercased, spaces stripped) before validation.
  const isManualMpesa = paymentMethod === "mpesa";
  const mpesaCode = isManualMpesa
    ? normaliseMpesaCode(input.mpesaTransactionCode ?? "")
    : null;
  if (isManualMpesa && (mpesaCode === null || !MPESA_CODE_PATTERN.test(mpesaCode))) {
    throw ApiError.validation(
      "Enter the M-Pesa transaction code from your payment confirmation SMS."
    );
  }

  const phone = normaliseKePhone(input.customer.phone) ?? input.customer.phone;

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        // 1. Atomic conditional stock decrements (race-safe, no negative stock)
        for (const line of lines) {
          if (line.variantId) {
            const variantResult = await tx.productVariant.updateMany({
              where: { id: line.variantId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (variantResult.count === 0) {
              throw ApiError.conflict(
                `Only a few left of "${line.productName}" and someone was faster. Please adjust the quantity.`,
                "OUT_OF_STOCK"
              );
            }
          }
          const productResult = await tx.product.updateMany({
            where: { id: line.productId, stockQuantity: { gte: line.quantity } },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (productResult.count === 0) {
            throw ApiError.conflict(
              `Only a few left of "${line.productName}" and someone was faster. Please adjust the quantity.`,
              "OUT_OF_STOCK"
            );
          }
        }

        // 2. Upsert the customer (keyed by normalised phone) + address history
        const customer = await tx.customer.upsert({
          where: { phone },
          create: {
            fullName: input.customer.fullName,
            phone,
            email: input.customer.email ?? null,
          },
          update: {
            fullName: input.customer.fullName,
            ...(input.customer.email !== undefined ? { email: input.customer.email } : {}),
          },
        });
        await tx.address.create({
          data: {
            customerId: customer.id,
            location: input.customer.deliveryLocation,
            notes: input.customer.notes ?? null,
          },
        });

        // 3. Human-friendly order number (MIC-YYYYMMDD-NNNN, Nairobi time)
        const orderNumber = await generateOrderNumber(tx, attempt);

        // 4. Duplicate protection for manually submitted M-Pesa codes —
        //    the same receipt (case-insensitive) can never be claimed twice
        //    while a previous submission is awaiting verification or paid.
        if (mpesaCode) {
          const duplicate = await tx.paymentTransaction.findFirst({
            where: {
              receipt: { equals: mpesaCode, mode: "insensitive" },
              payment: { provider: "mpesa", status: { in: ["pending", "success"] } },
            },
            select: { id: true },
          });
          if (duplicate) {
            throw ApiError.conflict(
              "This transaction code has already been submitted. Please check the code in your M-Pesa SMS, or contact us on WhatsApp.",
              "DUPLICATE_TRANSACTION_CODE"
            );
          }
        }

        // 5. Create order + items + initial status event (+ manual M-Pesa
        //    payment audit rows). Manual M-Pesa orders are NEVER auto-paid —
        //    they await verification by the store owner.
        return tx.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            fullName: input.customer.fullName,
            phone,
            email: input.customer.email ?? null,
            deliveryLocation: input.customer.deliveryLocation,
            notes: input.customer.notes ?? null,
            subtotal,
            deliveryFee,
            total,
            paymentMethod,
            paymentStatus: isManualMpesa ? "pending" : "unpaid",
            status: "pending",
            items: {
              create: lines.map((line) => ({
                productId: line.productId,
                productName: line.productName,
                productSlug: line.productSlug,
                imageUrl: line.imageUrl,
                size: line.size,
                color: line.color,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,
              })),
            },
            statusHistory: {
              create: {
                previousStatus: null,
                newStatus: "pending",
                note: isManualMpesa
                  ? `Order placed — M-Pesa payment code ${mpesaCode} awaiting verification`
                  : "Order placed",
              },
            },
            ...(isManualMpesa
              ? {
                  payments: {
                    create: {
                      provider: "mpesa" as const,
                      status: "pending" as const,
                      amount: total,
                      phone,
                      transactions: {
                        create: {
                          // Satisfies the @unique checkoutRequestId constraint
                          checkoutRequestId: `MANUAL-${orderNumber}`,
                          receipt: mpesaCode,
                          resultDesc: "Awaiting manual verification by the store owner",
                        },
                      },
                    },
                  },
                }
              : {}),
          },
          include: orderInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    );

    const mappedOrder = mapOrder(created);

    // Emails are fire-and-forget AFTER the transaction committed — a mail
    // failure can never roll back (or slow down) a placed order.
    void sendOrderPlacedEmails(mappedOrder);

    return mappedOrder;
  } catch (error) {
    // Concurrent checkouts can compute the same daily sequence — retry.
    if (isOrderNumberCollision(error)) {
      return createOrder(input, attempt + 1);
    }
    throw error;
  }
}

// ------------------------------ Lookups ------------------------------------

export async function findOrderByNumber(orderNumber: string): Promise<Order> {
  const order = await prisma.order.findFirst({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    include: orderInclude,
  });
  if (!order) {
    throw ApiError.notFound(
      "We could not find that order. Check the number and try again.",
      "ORDER_NOT_FOUND"
    );
  }
  return mapOrder(order);
}

export async function findOrderByIdOrNumber(idOrNumber: string): Promise<Order> {
  const needle = idOrNumber.trim();
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: needle }, { orderNumber: needle.toUpperCase() }] },
    include: orderInclude,
  });
  if (!order) {
    throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  }
  return mapOrder(order);
}

// ------------------------------ Admin queries ------------------------------

export async function queryOrders(opts: {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}): Promise<Paginated<Order>> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(60, Math.max(1, opts.limit ?? 20));

  const where: Prisma.OrderWhereInput = {};
  if (opts.status) where.status = opts.status;
  if (opts.paymentStatus) where.paymentStatus = opts.paymentStatus;
  if (opts.search && opts.search.trim() !== "") {
    where.OR = [
      { orderNumber: { contains: opts.search.trim(), mode: "insensitive" } },
      { fullName: { contains: opts.search.trim(), mode: "insensitive" } },
      { phone: { contains: opts.search.trim() } },
      { email: { contains: opts.search.trim(), mode: "insensitive" } },
    ];
  }

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return paginated(rows.map(mapOrder), page, limit, total);
}

export async function updateOrderStatus(
  idOrNumber: string,
  status: OrderStatus,
  note: string | undefined,
  changedBy: string
): Promise<Order> {
  let changed = false;
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { OR: [{ id: idOrNumber.trim() }, { orderNumber: idOrNumber.trim().toUpperCase() }] },
      include: orderInclude,
    });
    if (!order) throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");

    assertTransition(order.status, status);

    if (order.status === status) {
      return order; // no-op — matches Phase 1 behaviour
    }
    changed = true;

    // Cancelling an order whose payment is still awaiting verification also
    // cancels the payment (same transaction). A paid payment is left alone —
    // the owner handles refunds offline.
    const cancelPendingPayment = status === "cancelled" && order.paymentStatus === "pending";
    const effectiveNote = note ?? (cancelPendingPayment ? "Order cancelled — payment marked as cancelled" : undefined);

    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: status,
        changedBy,
        ...(effectiveNote ? { note: effectiveNote.slice(0, 300) } : {}),
      },
    });

    if (cancelPendingPayment) {
      await tx.payment.updateMany({
        where: { orderId: order.id, provider: "mpesa", status: "pending" },
        data: { status: "cancelled" },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status,
        ...(cancelPendingPayment ? { paymentStatus: "cancelled" as const } : {}),
      },
      include: orderInclude,
    });
  });

  const mappedOrder = mapOrder(updated);

  // Customer status email — only when the status actually changed, always
  // fire-and-forget so a mail failure never surfaces to the admin.
  if (changed) {
    void sendOrderStatusEmail(mappedOrder, note);
  }

  return mappedOrder;
}

/**
 * Human-readable labels for the audited payment-status endpoint messages.
 */
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "unpaid",
  pending: "awaiting verification",
  paid: "paid",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

/**
 * AUDITED admin payment-status update (POST /api/admin/orders/:id/payment-status).
 * Replaces the old free-form PATCH override. Single transaction:
 *  - 404 unknown order, 400 invalid status (zod), 409 no-op / paid-guard.
 *  - Updates the latest pending mpesa Payment (success/failed/cancelled) and
 *    its transaction processedAt when marking paid.
 *  - ALWAYS writes an OrderStatusEvent (previousStatus = newStatus = order.status).
 *  - On the transition TO paid, fires the customer "payment verified" email
 *    (fire-and-forget, only when the customer left an email address).
 */
export async function updateOrderPaymentStatusAudited(
  idOrNumber: string,
  requestedStatus: PaymentStatus,
  note: string | undefined,
  changedBy: string
): Promise<Order> {
  let transitionedToPaid = false;
  let paidCode: string | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { OR: [{ id: idOrNumber.trim() }, { orderNumber: idOrNumber.trim().toUpperCase() }] },
      include: orderInclude,
    });
    if (!order) throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");

    if (order.paymentStatus === requestedStatus) {
      throw ApiError.conflict(
        `Payment status is already ${PAYMENT_STATUS_LABELS[requestedStatus]}.`,
        "PAYMENT_STATUS_NOOP"
      );
    }

    const latestMpesaPayment =
      [...order.payments]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .find((p) => p.provider === "mpesa") ?? null;

    // Guard: a verified (success) payment cannot be declared failed.
    if (latestMpesaPayment?.status === "success" && requestedStatus === "failed") {
      throw ApiError.conflict(
        "This payment is already marked as paid. Use Refunded or Cancelled instead.",
        "PAYMENT_ALREADY_PAID"
      );
    }

    const mpesaCode = latestMpesaReceipt(order.payments);

    // Update the latest PENDING mpesa Payment row (only when it isn't success).
    if (latestMpesaPayment && latestMpesaPayment.status === "pending") {
      if (requestedStatus === "paid") {
        await tx.payment.update({
          where: { id: latestMpesaPayment.id },
          data: { status: "success" },
        });
        const transaction = [...latestMpesaPayment.transactions].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0];
        if (transaction && transaction.processedAt === null) {
          await tx.paymentTransaction.update({
            where: { id: transaction.id },
            data: { processedAt: new Date() },
          });
        }
      } else if (requestedStatus === "failed" || requestedStatus === "cancelled") {
        await tx.payment.update({
          where: { id: latestMpesaPayment.id },
          data: { status: requestedStatus },
        });
      }
      // unpaid/refunded leave the PaymentTransactionStatus rows untouched
      // (there is no "refunded" transaction status; refunds happen offline).
    }

    // ALWAYS audited: history event keeps the order status unchanged.
    let defaultNote: string;
    switch (requestedStatus) {
      case "paid":
        defaultNote =
          `Payment verified by ${changedBy}` +
          (order.paymentMethod === "mpesa" && mpesaCode ? ` — M-Pesa code ${mpesaCode}` : "");
        break;
      case "failed":
        defaultNote = "Payment marked as failed";
        break;
      case "cancelled":
        defaultNote = "Payment marked as cancelled";
        break;
      case "pending":
        defaultNote = "Payment reset to awaiting verification";
        break;
      case "unpaid":
        defaultNote = "Payment marked as unpaid";
        break;
      case "refunded":
        defaultNote = "Payment marked as refunded";
        break;
    }

    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: order.status,
        changedBy,
        note: (note ?? defaultNote).slice(0, 300),
      },
    });

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: requestedStatus },
      include: orderInclude,
    });

    transitionedToPaid = requestedStatus === "paid" && order.paymentStatus !== "paid";
    paidCode = mpesaCode;
    return updated;
  });

  const mappedOrder = mapOrder(updated);

  // First time this order transitions TO paid → thank the customer
  // (fire-and-forget; only when we have their email address).
  if (transitionedToPaid && mappedOrder.customer.email) {
    void sendPaymentVerifiedEmail(mappedOrder, paidCode);
  }

  return mappedOrder;
}

/** Used by the M-Pesa module: system-driven payment confirmation. */
export async function confirmOrderPaidBySystem(
  tx: DbTx,
  orderId: string,
  note: string
): Promise<void> {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "paid" } });

  if (order.status === "pending") {
    await tx.orderStatusEvent.create({
      data: {
        orderId,
        previousStatus: order.status,
        newStatus: "confirmed",
        changedBy: null,
        note,
      },
    });
    await tx.order.update({ where: { id: orderId }, data: { status: "confirmed" } });
  }
}

export { ORDER_STATUSES };
