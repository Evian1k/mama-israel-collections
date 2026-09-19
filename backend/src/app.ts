import Fastify, { type FastifyInstance } from "fastify";
import { registerCors } from "./plugins/cors";
import { registerHelmet } from "./plugins/helmet";
import { registerRateLimit } from "./plugins/rate-limit";
import { registerUploads } from "./plugins/uploads";
import { registerAdminAuth } from "./plugins/admin-auth";
import { handleError, handleNotFound } from "./lib/http";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

import { authRoutes } from "./modules/auth/auth.routes";
import { storeRoutes } from "./modules/store/store.routes";
import { categoryRoutes } from "./modules/categories/categories.routes";
import { publicProductRoutes } from "./modules/products/products.routes";
import { adminProductRoutes } from "./modules/products/products.admin.routes";
import { publicOrderRoutes } from "./modules/orders/orders.routes";
import { adminOrderRoutes } from "./modules/orders/orders.admin.routes";
import { customerRoutes } from "./modules/customers/customers.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { engagementRoutes } from "./modules/engagement/engagement.routes";
import { uploadRoutes } from "./modules/uploads/uploads.routes";
import { paymentRoutes } from "./modules/payments/payments.routes";
import { systemRoutes } from "./modules/system/system.routes";

/**
 * ============================================================================
 * APP — Fastify instance assembly (plugins → routes → error handling).
 * ============================================================================
 */

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.isProduction ? "info" : "warn",
    },
    trustProxy: true, // Render sits behind a proxy
    bodyLimit: 1024 * 1024, // 1MB JSON cap (uploads are streamed multipart)
  });

  // ------------------------------ Plugins ------------------------------
  await registerHelmet(app);
  await registerCors(app);
  await registerRateLimit(app);
  await registerUploads(app);
  await registerAdminAuth(app);

  // --------------------------- Error handling ---------------------------
  // Must be set BEFORE routes are registered so every plugin scope inherits it.
  app.setErrorHandler(handleError);
  app.setNotFoundHandler(handleNotFound);

  // ------------------------------ Health -------------------------------
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.code(200).send({ status: "ok", database: "connected" });
    } catch {
      return reply
        .code(503)
        .send({ status: "degraded", database: "unavailable" });
    }
  });

  // ------------------------------ Routes -------------------------------
  await app.register(authRoutes);
  await app.register(storeRoutes);
  await app.register(categoryRoutes);
  await app.register(publicProductRoutes);
  await app.register(adminProductRoutes);
  await app.register(publicOrderRoutes);
  await app.register(adminOrderRoutes);
  await app.register(customerRoutes);
  await app.register(analyticsRoutes);
  await app.register(engagementRoutes);
  await app.register(uploadRoutes);
  await app.register(paymentRoutes);
  await app.register(systemRoutes);

  return app;
}
