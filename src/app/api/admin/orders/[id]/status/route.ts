import { requireAdmin } from "@/server/admin-auth";
import { updateOrderStatus } from "@/server/dev-store/orders";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { orderStatusUpdateSchema, parseOrThrow } from "@/server/validation";

/** PATCH /api/admin/orders/:id/status — move an order through its lifecycle */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseOrThrow(orderStatusUpdateSchema, body);
    const order = updateOrderStatus(decodeURIComponent(id), input.status, input.note);
    return ok(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
