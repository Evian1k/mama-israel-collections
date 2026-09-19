import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";

/**
 * Security headers. CSP is disabled (this is a JSON API); images under
 * /uploads stay embeddable from the frontend origin in dev.
 */
export async function registerHelmet(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  });
}
