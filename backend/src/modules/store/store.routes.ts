import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { parseOrThrow, settingsPatchSchema } from "../../lib/validation";
import { getSettings, updateSettings } from "./store.service";

/**
 * Store settings routes:
 *   GET   /api/store           (public)  → StoreSettings WITHOUT the payments
 *                                          block (admin-only configuration)
 *   GET   /api/admin/settings  (admin)   → StoreSettings (incl. payments)
 *   PATCH /api/admin/settings  (admin)   → StoreSettings
 */
export async function storeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/store", async (_request, reply) => {
    const settings = await getSettings();
    // SECURITY: the owner's M-Pesa settings configuration is admin-only data.
    // Checkout payment info is exposed exclusively via GET /api/payments/methods.
    const { payments: _adminOnly, ...publicSettings } = settings;
    return ok(reply, publicSettings);
  });

  app.get("/api/admin/settings", { preHandler: app.requireAdmin }, async (_request, reply) => {
    const settings = await getSettings();
    return ok(reply, settings);
  });

  app.patch(
    "/api/admin/settings",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const input = parseOrThrow(settingsPatchSchema, request.body);
      const settings = await updateSettings(input);
      return ok(reply, settings);
    }
  );
}
