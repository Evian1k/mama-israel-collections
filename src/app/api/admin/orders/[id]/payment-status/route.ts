import { ApiError } from "@/services/api/client";
import { requireAdmin } from "@/server/admin-auth";
import { setOrderPaymentStatus } from "@/server/dev-store/orders";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, paymentStatusUpdateSchema } from "@/server/validation";

/**
 * POST /api/admin/orders/:id/payment-status — audited payment verification.
 * The owner confirms an M-Pesa transaction code against their own M-Pesa
 * records (or records cash collected / refunded / failed / cancelled).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseOrThrow(paymentStatusUpdateSchema, body);
    if (!input.status) {
      throw new ApiError("Choose a payment status.", 400, "BAD_REQUEST");
    }
    const order = setOrderPaymentStatus(decodeURIComponent(id), input.status, input.note);
    return ok(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
