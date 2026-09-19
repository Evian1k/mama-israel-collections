import { createOrder } from "@/server/dev-store/orders";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, placeOrderSchema } from "@/server/validation";

/**
 * POST /api/orders — place an order.
 * The server re-validates stock, variants and pricing, then snapshots the
 * order. On success the client should clear the cart and navigate to
 * /order-confirmation/[orderNumber].
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const input = parseOrThrow(placeOrderSchema, body);
    const order = createOrder(input);
    return ok(order, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
