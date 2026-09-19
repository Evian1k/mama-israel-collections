import { requireAdmin } from "@/server/admin-auth";
import { createProduct, queryProducts } from "@/server/dev-store/products";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, productInputSchema } from "@/server/validation";
import type { ProductQuery } from "@/types";

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** GET /api/admin/products — full catalogue including inactive products */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const query: ProductQuery = {
      page: num(searchParams.get("page")),
      limit: num(searchParams.get("limit")),
      search: searchParams.get("search") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      minPrice: num(searchParams.get("minPrice")),
      maxPrice: num(searchParams.get("maxPrice")),
      sort: (searchParams.get("sort") as ProductQuery["sort"]) ?? undefined,
      inStock: searchParams.get("inStock") === "true" || undefined,
      includeInactive: true,
    };
    return ok(queryProducts(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/admin/products — create a product */
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await readJsonBody(request);
    const input = parseOrThrow(productInputSchema, body);
    const product = createProduct(input);
    return ok(product, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
