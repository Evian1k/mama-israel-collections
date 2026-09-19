import { queryProducts } from "@/server/dev-store/products";
import { ok, toErrorResponse } from "@/server/http";
import type { ProductQuery, ProductSort } from "@/types";

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc", "name_asc", "featured"];

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** GET /api/products — filtered, sorted, paginated catalogue */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortParam = searchParams.get("sort");
    const sort = SORTS.includes(sortParam as ProductSort) ? (sortParam as ProductSort) : undefined;

    const query: ProductQuery = {
      page: num(searchParams.get("page")),
      limit: num(searchParams.get("limit")),
      search: searchParams.get("search") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      categorySlug: searchParams.get("categorySlug") ?? undefined,
      minPrice: num(searchParams.get("minPrice")),
      maxPrice: num(searchParams.get("maxPrice")),
      sizes: searchParams.get("sizes")?.split(",") ?? undefined,
      colors: searchParams.get("colors")?.split(",") ?? undefined,
      sort,
      featured: searchParams.get("featured") === "true" || undefined,
      newArrival: searchParams.get("newArrival") === "true" || undefined,
      inStock: searchParams.get("inStock") === "true" || undefined,
    };

    return ok(queryProducts(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
