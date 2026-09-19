import { requireAdmin } from "@/server/admin-auth";
import { computeDashboardStats } from "@/server/dev-store/stats";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/stats — dashboard aggregates (computed from real data) */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(computeDashboardStats());
  } catch (error) {
    return toErrorResponse(error);
  }
}
