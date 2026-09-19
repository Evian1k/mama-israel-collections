import { ApiError } from "@/services/api/client";
import { requireAdmin } from "@/server/admin-auth";
import { getOrderByIdOrNumber } from "@/server/dev-store/orders";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/orders/:id — order detail (by id or order number) */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const order = getOrderByIdOrNumber(decodeURIComponent(id));
    if (!order) {
      throw new ApiError("Order not found.", 404, "ORDER_NOT_FOUND");
    }
    return ok(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
