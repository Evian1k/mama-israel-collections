import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { ApiError } from "../lib/errors";
import { env } from "../config/env";

/**
 * Rate limiting — generous global bucket, tighter per-route buckets are set on
 * sensitive endpoints (login, orders, order lookup, newsletter/contact, STK push).
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: env.isProduction ? 120 : 600,
    timeWindow: "1 minute",
    errorResponseBuilder: () => {
      throw ApiError.rateLimited();
    },
  });
}

export const RATE_LIMITS = {
  login: { max: env.isProduction ? 10 : 60, timeWindow: "1 minute" },
  orderCreate: { max: env.isProduction ? 10 : 60, timeWindow: "1 minute" },
  orderLookup: { max: env.isProduction ? 20 : 120, timeWindow: "1 minute" },
  orderUpdate: { max: env.isProduction ? 40 : 120, timeWindow: "1 minute" },
  engagement: { max: env.isProduction ? 6 : 60, timeWindow: "1 minute" },
  stkPush: { max: env.isProduction ? 5 : 30, timeWindow: "1 minute" },
  paymentLookup: { max: env.isProduction ? 30 : 120, timeWindow: "1 minute" },
  upload: { max: env.isProduction ? 30 : 120, timeWindow: "1 minute" },
} as const;
