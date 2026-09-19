import { requireAdmin } from "@/server/admin-auth";
import { computeAnalytics } from "@/server/dev-store/stats";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/analytics — trend data for the Analytics page */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days"));
    return ok(computeAnalytics(Number.isFinite(days) && days >= 7 && days <= 60 ? days : 14));
  } catch (error) {
    return toErrorResponse(error);
  }
}
