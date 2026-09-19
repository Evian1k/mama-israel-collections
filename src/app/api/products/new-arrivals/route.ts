import { getNewArrivals } from "@/server/dev-store/products";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/products/new-arrivals */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
    return ok(getNewArrivals(limit));
  } catch (error) {
    return toErrorResponse(error);
  }
}
