import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { getCustomerDetail, listCustomers } from "./customers.service";

/**
 * Admin customer routes (require Authorization: Bearer <token>):
 *   GET /api/admin/customers      — aggregated from real orders
 *   GET /api/admin/customers/:id  — summary + full order history
 *
 * Customer data is never exposed publicly.
 */
export async function customerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/admin/customers", { preHandler: app.requireAdmin }, async (_request, reply) => {
    return ok(reply, await listCustomers());
  });

  app.get("/api/admin/customers/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return ok(reply, await getCustomerDetail(id));
  });
}
