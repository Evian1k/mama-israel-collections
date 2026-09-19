import type { FastifyInstance } from "fastify";
import { ok, readPagination } from "../../lib/http";
import {
  orderStatusUpdateSchema,
  parseOrThrow,
  paymentStatusUpdateSchema,
} from "../../lib/validation";
import {
  findOrderByIdOrNumber,
  queryOrders,
  updateOrderPaymentStatusAudited,
  updateOrderStatus,
} from "./orders.service";
import type { OrderStatus, PaymentStatus } from "../../shared/api-types";
import { RATE_LIMITS } from "../../plugins/rate-limit";

/**
 * Admin order routes (require Authorization: Bearer <token>):
 *   GET  /api/admin/orders
 *   GET  /api/admin/orders/:id                      (id or order number)
 *   PATCH /api/admin/orders/:id/status              (status machine + history)
 *   POST /api/admin/orders/:id/payment-status       (audited manual M-Pesa
 *        verification: paid / pending / failed / cancelled / unpaid / refunded)
 */
export async function adminOrderRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/admin/orders", { preHandler: app.requireAdmin }, async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const { page, limit } = readPagination(q, 20, 60);
    const status = typeof q.status === "string" && q.status !== "all" ? (q.status as OrderStatus) : undefined;
    const paymentStatus =
      typeof q.paymentStatus === "string" && q.paymentStatus !== "all"
        ? (q.paymentStatus as PaymentStatus)
        : undefined;
    const search = typeof q.search === "string" && q.search.trim() !== "" ? q.search.trim() : undefined;

    return ok(
      reply,
      await queryOrders({ page, limit, status, paymentStatus, search })
    );
  });

  app.get("/api/admin/orders/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return ok(reply, await findOrderByIdOrNumber(id));
  });

  app.patch(
    "/api/admin/orders/:id/status",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parseOrThrow(orderStatusUpdateSchema, request.body);
      const order = await updateOrderStatus(id, input.status, input.note, request.adminUser.email);
      return ok(reply, order);
    }
  );

  // Audited payment verification (manual M-Pesa flow). Replaces the old
  // free-form PATCH /api/admin/orders/:id paymentStatus override.
  app.post(
    "/api/admin/orders/:id/payment-status",
    { preHandler: app.requireAdmin, config: { rateLimit: RATE_LIMITS.orderUpdate } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parseOrThrow(paymentStatusUpdateSchema, request.body);
      const order = await updateOrderPaymentStatusAudited(
        id,
        input.status,
        input.note,
        request.adminUser.email
      );
      return ok(reply, order);
    }
  );
}
