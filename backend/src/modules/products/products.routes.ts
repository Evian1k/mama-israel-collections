import type { FastifyInstance } from "fastify";
import { ok, readBoolean, readNumber, readPagination, readStringList } from "../../lib/http";
import { ApiError } from "../../lib/errors";
import {
  findPublicProduct,
  getFeatured,
  getNewArrivals,
  queryProducts,
  searchProducts,
} from "./products.service";
import type { ProductSort } from "../../shared/api-types";

/**
 * Public product routes (frozen frontend contract):
 *   GET /api/products                — full filter/sort/pagination
 *   GET /api/products/featured
 *   GET /api/products/new-arrivals
 *   GET /api/products/search?q=
 *   GET /api/products/:slug          — slug or id, active products only
 */

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc", "name_asc", "featured"];

function readSort(raw: unknown): ProductSort | undefined {
  if (typeof raw !== "string") return undefined;
  return SORTS.includes(raw as ProductSort) ? (raw as ProductSort) : undefined;
}

export async function publicProductRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/products", async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const { page, limit } = readPagination(q, 12, 48);
    const result = await queryProducts({
      page,
      limit,
      search: typeof q.search === "string" && q.search.trim() !== "" ? q.search.trim().slice(0, 120) : undefined,
      categoryId: typeof q.categoryId === "string" && q.categoryId !== "" ? q.categoryId : undefined,
      categorySlug:
        typeof q.categorySlug === "string" && q.categorySlug !== "" ? q.categorySlug : undefined,
      minPrice: readNumber(q, "minPrice"),
      maxPrice: readNumber(q, "maxPrice"),
      sizes: readStringList(q, "sizes"),
      colors: readStringList(q, "colors"),
      sort: readSort(q.sort),
      featured: readBoolean(q, "featured"),
      newArrival: readBoolean(q, "newArrival"),
      inStock: readBoolean(q, "inStock"),
    });
    return ok(reply, result);
  });

  app.get("/api/products/featured", async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const limit = readNumber(q, "limit");
    return ok(reply, await getFeatured(limit ?? 8));
  });

  app.get("/api/products/new-arrivals", async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const limit = readNumber(q, "limit");
    return ok(reply, await getNewArrivals(limit ?? 8));
  });

  app.get("/api/products/search", async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const term = typeof q.q === "string" ? q.q.trim() : "";
    if (term === "") return ok(reply, []);
    if (term.length > 120) throw ApiError.badRequest("Search term is too long.");
    const limit = readNumber(q, "limit") ?? 8;
    return ok(reply, await searchProducts(term, limit));
  });

  app.get("/api/products/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const product = await findPublicProduct(slug);
    if (!product) {
      throw ApiError.notFound("This product could not be found.", "PRODUCT_NOT_FOUND");
    }
    return ok(reply, product);
  });
}
