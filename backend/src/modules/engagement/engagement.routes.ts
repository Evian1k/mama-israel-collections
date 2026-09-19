import { prisma } from "../../lib/prisma";
import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { contactSchema, newsletterSchema, parseOrThrow } from "../../lib/validation";
import { RATE_LIMITS } from "../../plugins/rate-limit";

/**
 * Engagement routes (documented Phase 1 extension, now backed by PostgreSQL):
 *   POST /api/newsletter  { email }                       → NewsletterResult
 *   POST /api/contact     { name, email, phone?, message } → ContactResult
 */
export async function engagementRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/newsletter",
    { config: { rateLimit: RATE_LIMITS.engagement } },
    async (request, reply) => {
      const { email } = parseOrThrow(newsletterSchema, request.body);
      const normalised = email.trim().toLowerCase();

      await prisma.newsletterSubscriber.upsert({
        where: { email: normalised },
        create: { email: normalised },
        update: {}, // already subscribed — same friendly response either way
      });

      return ok(reply, {
        email: normalised,
        message: "Karibu! You are on the list — watch your inbox for new arrivals.",
      });
    }
  );

  app.post(
    "/api/contact",
    { config: { rateLimit: RATE_LIMITS.engagement } },
    async (request, reply) => {
      const input = parseOrThrow(contactSchema, request.body);

      await prisma.contactMessage.create({
        data: {
          name: input.name,
          email: input.email.trim().toLowerCase(),
          phone: input.phone ?? null,
          message: input.message,
        },
      });

      return ok(reply, {
        message: "Message received! We will get back to you as soon as we can.",
      });
    }
  );
}
