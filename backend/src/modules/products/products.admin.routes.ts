import type { FastifyInstance } from "fastify";
import { ok, readBoolean, readNumber, readPagination, readStringList } from "../../lib/http";
import { productInputSchema, parseOrThrow } from "../../lib/validation";
import {
  createProduct,
  deleteProduct,
  findAdminProduct,
  queryProducts,
  updateProduct,
} from "./products.service";
import type { ProductSort } from "../../shared/api-types";

/**
 * Admin product routes (require Authorization: Bearer <token>):
 *   GET    /api/admin/products
 *   GET    /api/admin/products/:id
 *   POST   /api/admin/products
 *   PATCH  /api/admin/products/:id
 *   DELETE /api/admin/products/:id
 */

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc", "name_asc", "featured"];

function readSort(raw: unknown): ProductSort | undefined {
  if (typeof raw !== "string") return undefined;
  return SORTS.includes(raw as ProductSort) ? (raw as ProductSort) : undefined;
}

export async function adminProductRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/admin/products", { preHandler: app.requireAdmin }, async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const { page, limit } = readPagination(q, 20, 48);
    const result = await queryProducts({
      page,
      limit,
      search: typeof q.search === "string" && q.search.trim() !== "" ? q.search.trim().slice(0, 120) : undefined,
      categoryId: typeof q.categoryId === "string" && q.categoryId !== "" ? q.categoryId : undefined,
      minPrice: readNumber(q, "minPrice"),
      maxPrice: readNumber(q, "maxPrice"),
      sizes: readStringList(q, "sizes"),
      colors: readStringList(q, "colors"),
      sort: readSort(q.sort),
      inStock: readBoolean(q, "inStock"),
      includeInactive: readBoolean(q, "includeInactive") ?? true,
    });
    return ok(reply, result);
  });

  app.get("/api/admin/products/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return ok(reply, await findAdminProduct(id));
  });

  app.post("/api/admin/products", { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = parseOrThrow(productInputSchema, request.body);
    return ok(reply, await createProduct(input), 201);
  });

  app.patch(
    "/api/admin/products/:id",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parseOrThrow(productInputSchema.partial(), request.body);
      return ok(reply, await updateProduct(id, input));
    }
  );

  app.delete("/api/admin/products/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteProduct(id);
    return ok(reply, { id });
  });
}
