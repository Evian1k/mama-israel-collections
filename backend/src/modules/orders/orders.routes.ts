import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { placeOrderSchema, parseOrThrow } from "../../lib/validation";
import { createOrder, findOrderByNumber } from "./orders.service";
import { RATE_LIMITS } from "../../plugins/rate-limit";

/**
 * Public order routes (frozen frontend contract):
 *   POST /api/orders                — server re-prices + reserves stock
 *   GET  /api/orders/:orderNumber   — public status lookup (rate-limited)
 */
export async function publicOrderRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/orders",
    { config: { rateLimit: RATE_LIMITS.orderCreate } },
    async (request, reply) => {
      const input = parseOrThrow(placeOrderSchema, request.body);
      const order = await createOrder(input);
      return ok(reply, order, 201);
    }
  );

  app.get(
    "/api/orders/:orderNumber",
    { config: { rateLimit: RATE_LIMITS.orderLookup } },
    async (request, reply) => {
      const { orderNumber } = request.params as { orderNumber: string };
      return ok(reply, await findOrderByNumber(orderNumber));
    }
  );
}
