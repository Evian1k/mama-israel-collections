import type { FastifyInstance } from "fastify";
import { ok, readNumber } from "../../lib/http";
import { computeAnalytics, computeDashboardStats } from "./analytics.service";

/**
 * Admin analytics routes (require Authorization: Bearer <token>):
 *   GET /api/admin/stats      → dashboard cards + recent activity
 *   GET /api/admin/analytics  → trends (?days=1..90, default 14)
 */
export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/admin/stats", { preHandler: app.requireAdmin }, async (_request, reply) => {
    return ok(reply, await computeDashboardStats());
  });

  app.get("/api/admin/analytics", { preHandler: app.requireAdmin }, async (request, reply) => {
    const q = (request.query ?? {}) as Record<string, unknown>;
    const days = readNumber(q, "days") ?? 14;
    return ok(reply, await computeAnalytics(days));
  });
}
