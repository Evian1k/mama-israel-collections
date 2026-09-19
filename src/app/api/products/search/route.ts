import { queryProducts } from "@/server/dev-store/products";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/products/search?q=term — lightweight search endpoint */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 8;

    if (!q) {
      return ok({ items: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false } });
    }

    const result = queryProducts({ search: q, limit, page: 1, sort: "newest" });
    return ok(result.items);
  } catch (error) {
    return toErrorResponse(error);
  }
}
