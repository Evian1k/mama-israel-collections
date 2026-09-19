import { ApiError } from "@/services/api/client";
import { getOrderByNumber } from "@/server/dev-store/orders";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/orders/:orderNumber — order status lookup for customers */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const order = getOrderByNumber(decodeURIComponent(orderNumber));
    if (!order) {
      throw new ApiError(
        "We could not find that order. Double-check the order number or contact us on WhatsApp.",
        404,
        "ORDER_NOT_FOUND"
      );
    }
    return ok(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
