import { requireAdmin } from "@/server/admin-auth";
import { listCustomers } from "@/server/dev-store/orders";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/customers — customers aggregated from orders */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(listCustomers());
  } catch (error) {
    return toErrorResponse(error);
  }
}
