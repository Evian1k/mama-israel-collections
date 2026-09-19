import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { verifyAdminToken } from "../lib/jwt";
import { ApiError } from "../lib/errors";
import type { AdminUser } from "../shared/api-types";

/**
 * Admin authentication + authorization.
 *
 * - requireAdmin: Fastify preHandler. Verifies the Bearer JWT, loads the
 *   current AdminUser from PostgreSQL (revoking access when the account is
 *   deleted) and attaches it to the request.
 * - Every /api/admin/* route uses this. Public routes never touch it.
 */

declare module "fastify" {
  interface FastifyRequest {
    adminUser: AdminUser;
  }
}

export async function resolveAdmin(request: FastifyRequest): Promise<AdminUser> {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw ApiError.unauthorized("Please sign in to the admin panel.");
  }

  const payload = verifyAdminToken(token);

  const user = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
  if (!user || user.role !== "admin") {
    throw ApiError.unauthorized("This account no longer has admin access.");
  }

  const admin: AdminUser = { id: user.id, name: user.name, email: user.email, role: "admin" };
  // Attach for downstream handlers (request.adminUser.email, etc.)
  request.adminUser = admin;
  return admin;
}

export async function requireAdmin(request: FastifyRequest): Promise<AdminUser> {
  return resolveAdmin(request);
}

declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: (request: FastifyRequest) => Promise<AdminUser>;
  }
}

export async function registerAdminAuth(app: FastifyInstance): Promise<void> {
  app.decorate("requireAdmin", requireAdmin);
}
