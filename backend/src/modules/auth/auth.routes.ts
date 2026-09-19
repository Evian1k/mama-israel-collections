import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { ApiError } from "../../lib/errors";
import { changePasswordSchema, loginSchema, parseOrThrow } from "../../lib/validation";
import { changeAdminPassword, login, logoutMessage, sessionFor } from "./auth.service";
import { prisma } from "../../lib/prisma";
import { RATE_LIMITS } from "../../plugins/rate-limit";

/**
 * Admin auth routes (frozen frontend contract):
 *   POST /api/admin/auth/login    { email, password } → AdminSession
 *   GET  /api/admin/auth/session  (Bearer)            → AdminSession
 *   POST /api/admin/auth/logout   (Bearer)            → { message }
 *   POST /api/admin/account/change-password (Bearer)  → fresh AdminSession
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/admin/auth/login",
    { config: { rateLimit: RATE_LIMITS.login } },
    async (request, reply) => {
      const body = parseOrThrow(loginSchema, request.body);
      const session = await login(body.email.trim().toLowerCase(), body.password);
      return ok(reply, session);
    }
  );

  app.get("/api/admin/auth/session", async (request, reply) => {
    const admin = await app.requireAdmin(request);
    const dbUser = await prisma.adminUser.findUnique({
      where: { id: admin.id },
    });
    if (!dbUser) throw ApiError.unauthorized("This account no longer exists.");
    return ok(reply, await sessionFor(dbUser));
  });

  app.post("/api/admin/auth/logout", async (request, reply) => {
    await app.requireAdmin(request); // validates the session; token is discarded client-side
    return ok(reply, logoutMessage());
  });

  // Admin onboarding: replace the bootstrap password (+ optional email change).
  // Returns a FRESH AdminSession (new JWT with the updated email) and
  // mustChangePassword: false so the forced-change flow can complete.
  app.post(
    "/api/admin/account/change-password",
    { config: { rateLimit: RATE_LIMITS.login } },
    async (request, reply) => {
      const admin = await app.requireAdmin(request);
      const input = parseOrThrow(changePasswordSchema, request.body);
      const session = await changeAdminPassword(admin.id, input);
      return ok(reply, session);
    }
  );
}
