import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { DEFAULT_PAYMENTS } from "../../lib/mappers";
import { getSettings, mpesaEffectivelyEnabled } from "../store/store.service";

/**
 * ============================================================================
 * SYSTEM — production readiness diagnostics for the store owner (admin only).
 * ============================================================================
 * GET /api/admin/system/production-check powers the owner's "go-live
 * checklist" in the admin panel. Rules:
 *  - NEVER throws: every check is individually wrapped so a broken probe
 *    degrades to a warn/fail entry with the error as its detail.
 *  - status ∈ "pass" | "warn" | "fail"; ok = true when nothing failed.
 *  - Honest reporting only: optional gaps (Daraja STK, Resend, Cloudinary)
 *    are warnings, security blockers (simulator in production, weak JWT,
 *    missing database) are failures.
 * ============================================================================
 */

type CheckStatus = "pass" | "warn" | "fail";

interface SystemCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

function check(id: string, label: string, status: CheckStatus, detail = ""): SystemCheck {
  return { id, label, status, detail };
}

/** Run a probe; any throw becomes a warn with the error message as detail. */
async function safeCheck(
  id: string,
  label: string,
  probe: () => Promise<SystemCheck> | SystemCheck
): Promise<SystemCheck> {
  try {
    return await probe();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unexpected error";
    return check(id, label, "warn", `Check could not run: ${detail}`.slice(0, 300));
  }
}

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/admin/system/production-check",
    { preHandler: app.requireAdmin },
    async (_request, reply) => {
      const checks: SystemCheck[] = [];

      checks.push(
        check(
          "database",
          "PostgreSQL database",
          env.databaseUrl && !env.databaseUrl.startsWith("file:") ? "pass" : "fail",
          env.databaseUrl && !env.databaseUrl.startsWith("file:")
            ? ""
            : "DATABASE_URL is missing or does not point to a PostgreSQL database."
        )
      );

      checks.push(
        check(
          "jwt",
          "Admin session signing (JWT secret)",
          env.jwtSecret && env.jwtSecret.length >= 32 ? "pass" : "fail",
          env.jwtSecret && env.jwtSecret.length >= 32
            ? ""
            : "JWT_SECRET must be at least 32 characters."
        )
      );

      checks.push(
        check(
          "frontend_url",
          "Frontend origin allow-list",
          env.frontendOrigins.length > 0 ? "pass" : "fail",
          env.frontendOrigins.length > 0
            ? ""
            : "FRONTEND_URL is empty — browser calls will be blocked by CORS."
        )
      );

      checks.push(
        await safeCheck("admin_account", "Admin account security", async () => {
          const pending = await prisma.adminUser.findFirst({
            where: { mustChangePassword: true },
          });
          return pending
            ? check(
                "admin_account",
                "Admin account security",
                "warn",
                "Setup password not changed yet — the admin will be asked to change it at first login."
              )
            : check("admin_account", "Admin account security", "pass");
        })
      );

      // ------------------------------ M-Pesa -------------------------------
      checks.push(
        check(
          "mpesa_simulator",
          "M-Pesa payment mode",
          env.mpesa.mode === "simulator" ? "fail" : "pass",
          env.mpesa.mode === "simulator"
            ? "MPESA_MODE=simulator is a dev-only test mode and refuses production."
            : ""
        )
      );

      checks.push(
        check(
          "mpesa_daraja_optional",
          "Daraja STK Push credentials (optional)",
          env.mpesa.configured ? "pass" : "warn",
          env.mpesa.configured
            ? ""
            : "Daraja STK Push credentials not set — optional; manual Till/Paybill payments work without them."
        )
      );

      checks.push(
        check(
          "mpesa_callback",
          "Daraja callback URL (optional)",
          env.mpesa.callbackUrl ? "pass" : "warn",
          env.mpesa.callbackUrl
            ? ""
            : "MPESA_CALLBACK_URL is empty — only needed for future STK Push confirmations."
        )
      );

      // ------------------------------ Email --------------------------------
      checks.push(
        check(
          "email",
          "Customer email delivery",
          env.email.resendApiKey ? "pass" : "warn",
          env.email.resendApiKey
            ? ""
            : "RESEND_API_KEY not set — order emails are recorded in EmailLog but not sent."
        )
      );

      // ------------------------------ Image storage -------------------------
      checks.push(
        check(
          "image_storage",
          "Product image storage",
          env.cloudinary.configured ? "pass" : "warn",
          env.cloudinary.configured
            ? "Cloudinary CDN storage"
            : "Local persistent storage (fine for self-hosting; ephemeral hosts need Cloudinary)"
        )
      );

      // ------------------------------ Storefront profile --------------------
      checks.push(
        await safeCheck("storefront_profile", "Storefront profile & payments", async () => {
          const settings = await getSettings();
          const payments = settings.payments ?? DEFAULT_PAYMENTS;
          const warnings: string[] = [];
          if (!settings.name.trim()) warnings.push("Store name is empty.");
          if (!settings.whatsappNumber.trim()) warnings.push("WhatsApp number is empty.");
          if (!settings.email.trim()) {
            warnings.push(
              "Store email is empty — admin notifications have no inbox unless EMAIL_ADMIN_INBOX is set."
            );
          }
          const mpesaOn = mpesaEffectivelyEnabled(payments);
          if (!payments.payOnDeliveryEnabled && !mpesaOn) {
            warnings.push("No payment method is enabled at checkout.");
          }
          return warnings.length > 0
            ? check("storefront_profile", "Storefront profile & payments", "warn", warnings.join(" "))
            : check("storefront_profile", "Storefront profile & payments", "pass");
        })
      );

      return ok(reply, {
        environment: env.nodeEnv,
        ok: checks.every((c) => c.status !== "fail"),
        checks,
      });
    }
  );
}
