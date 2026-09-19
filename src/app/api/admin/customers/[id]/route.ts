import { ApiError } from "@/services/api/client";
import { requireAdmin } from "@/server/admin-auth";
import { getCustomerDetail } from "@/server/dev-store/orders";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/customers/:id — customer profile + order history */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const customer = getCustomerDetail(decodeURIComponent(id));
    if (!customer) {
      throw new ApiError("Customer not found.", 404, "NOT_FOUND");
    }
    return ok(customer);
  } catch (error) {
    return toErrorResponse(error);
  }
}
