import { requireAdmin } from "@/server/admin-auth";
import { queryOrders } from "@/server/dev-store/orders";
import { ok, toErrorResponse } from "@/server/http";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/types/order";
import type { OrderStatus, PaymentStatus } from "@/types/order";

/** GET /api/admin/orders — paginated list with status/search filters */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const paymentParam = searchParams.get("paymentStatus");

    const status = ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;
    const paymentStatus = PAYMENT_STATUSES.includes(paymentParam as PaymentStatus)
      ? (paymentParam as PaymentStatus)
      : undefined;

    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));

    return ok(
      queryOrders({
        page: Number.isFinite(page) && page > 0 ? page : undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        status,
        paymentStatus,
        search: searchParams.get("search") ?? undefined,
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
