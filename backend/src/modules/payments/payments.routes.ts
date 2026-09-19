import type { FastifyInstance } from "fastify";
import { fail, ok } from "../../lib/http";
import { mpesaStkPushSchema, parseOrThrow } from "../../lib/validation";
import { getPaymentMethods } from "../store/store.service";
import {
  getPaymentStatus,
  initiateStkPush,
  isConfigured,
  mpesaMode,
  processStkCallback,
} from "./mpesa.service";
import { RATE_LIMITS } from "../../plugins/rate-limit";
import { env } from "../../config/env";

/**
 * Payment routes:
 *   GET  /api/payments/methods         (public) → checkout payment options
 *   POST /api/payments/mpesa/stk-push  { orderNumber, phone } → initiates STK push
 *   POST /api/payments/mpesa/callback  (Daraja → backend, idempotent)
 *   GET  /api/payments/:id             (public, minimal status for polling)
 *
 * SECURITY:
 *  - Payment success can ONLY be recorded via the Daraja callback (or admin
 *    override). The browser can never mark an order as paid.
 *  - The callback is rate-limit-exempt (Daraja servers must always reach it)
 *    and always answers 200 with { ResultCode: 0 } so Daraja stops retrying.
 *  - The customer's payment method at checkout is the MANUAL flow: they pay
 *    directly to the owner's Till/Paybill and submit the transaction code
 *    (see POST /api/orders). This module keeps the future Daraja STK Push
 *    integration — nothing requires it.
 */
export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // Public checkout payment info (owner-configured, admin-only in settings).
  app.get("/api/payments/methods", async (_request, reply) => {
    return ok(reply, await getPaymentMethods());
  });

  app.post(
    "/api/payments/mpesa/stk-push",
    { config: { rateLimit: RATE_LIMITS.stkPush } },
    async (request, reply) => {
      const input = parseOrThrow(mpesaStkPushSchema, request.body);
      const result = await initiateStkPush(input.orderNumber, input.phone);
      return ok(reply, result, 201);
    }
  );

  app.post("/api/payments/mpesa/callback", async (request, reply) => {
    const outcome = await processStkCallback(request.body as object);

    if (!outcome.handled) {
      request.log.warn({ checkout: "unknown-checkout-request-id" }, "M-Pesa callback for unknown transaction");
    } else {
      request.log.info({ outcome: outcome.status, duplicate: outcome.duplicate }, "M-Pesa callback processed");
    }

    // Daraja expects this shape; always accept so it stops retrying.
    return reply.code(200).send({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  app.get(
    "/api/payments/:id",
    { config: { rateLimit: RATE_LIMITS.paymentLookup } },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const payment = await getPaymentStatus(id);
      if (!payment) {
        return fail(reply, 404, "NOT_FOUND", "Payment not found.");
      }
      return ok(reply, payment);
    }
  );

  // Diagnostics (honest — used by tests and ops to verify configuration state)
  app.get("/api/payments/mpesa/config-status", async (_request, reply) => {
    return ok(reply, {
      // Simulator mode is usable without credentials — configured for the UI.
      configured: isConfigured() || mpesaMode() === "simulator",
      mode: mpesaMode(),
      environment: env.mpesa.environment,
      callbackConfigured: Boolean(env.mpesa.callbackUrl),
    });
  });
}
