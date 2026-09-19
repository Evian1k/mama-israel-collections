import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/env";

/**
 * CORS — only the configured frontend origins are allowed.
 * Production NEVER uses Access-Control-Allow-Origin: *.
 *
 * FRONTEND_URL accepts exact origins ("https://app.example.com") and
 * single-level subdomain wildcards ("https://*.space-z.ai") for platforms
 * whose preview subdomains rotate per session. A wildcard entry:
 *   - pins the scheme (https entry never matches http origin),
 *   - matches exactly ONE extra label ("a.space-z.ai", not "a.b.space-z.ai"
 *     and not "space-z.ai" itself),
 *   - must still be explicitly configured — nothing is allowed by default.
 */

const DEV_DEFAULT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function compileWildcard(entry: string): RegExp | null {
  if (!/^[a-z]+:\/\/\*\.[a-z0-9.-]+\/?$/i.test(entry)) return null;
  const base = entry.replace(/\/+$/, "");
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // "\*" (escaped) becomes exactly one hostname label.
  return new RegExp(`^${escaped.replace(/\\\*/g, "[a-z0-9-]+")}$`, "i");
}

export async function registerCors(app: FastifyInstance): Promise<void> {
  const origins = env.frontendOrigins.length > 0 ? env.frontendOrigins : env.isDevelopment ? DEV_DEFAULT_ORIGINS : [];
  const wildcardPatterns = origins
    .map(compileWildcard)
    .filter((pattern): pattern is RegExp => pattern !== null);

  const originAllowed = (origin: string): boolean =>
    origins.includes(origin) || wildcardPatterns.some((pattern) => pattern.test(origin));

  await app.register(cors, {
    origin: (origin, callback) => {
      // Same-origin / server-to-server requests (curl, health checks) have no Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (originAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: false, // Bearer-token auth, no cookies
    maxAge: 86400,
  });
}
