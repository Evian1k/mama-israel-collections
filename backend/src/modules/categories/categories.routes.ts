import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { ApiError } from "../../lib/errors";
import { categoryInputSchema, parseOrThrow } from "../../lib/validation";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./categories.service";

/**
 * Category routes:
 *   GET    /api/categories                (public, active only)
 *   GET    /api/admin/categories          (admin, all)
 *   POST   /api/admin/categories          (admin)
 *   PATCH  /api/admin/categories/:id      (admin)
 *   DELETE /api/admin/categories/:id      (admin, blocked while products exist)
 */
export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  // Public list. `includeInactive` is admin-only and requires the bearer token.
  app.get("/api/categories", async (request, reply) => {
    const includeInactive =
      request.query !== null &&
      typeof request.query === "object" &&
      (request.query as Record<string, unknown>).includeInactive === "true";

    if (includeInactive) {
      await app.requireAdmin(request);
      return ok(reply, await listCategories(true));
    }
    return ok(reply, await listCategories(false));
  });

  app.get("/api/admin/categories", { preHandler: app.requireAdmin }, async (_request, reply) => {
    return ok(reply, await listCategories(true));
  });

  app.post("/api/admin/categories", { preHandler: app.requireAdmin }, async (request, reply) => {
    const input = parseOrThrow(categoryInputSchema, request.body);
    return ok(reply, await createCategory(input), 201);
  });

  app.patch(
    "/api/admin/categories/:id",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parseOrThrow(categoryInputSchema.partial(), request.body);
      try {
        return ok(reply, await updateCategory(id, input));
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw error;
      }
    }
  );

  app.delete(
    "/api/admin/categories/:id",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await deleteCategory(id);
      return ok(reply, { id });
    }
  );
}
