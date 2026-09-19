import { requireAdmin } from "@/server/admin-auth";
import { getDb } from "@/server/dev-store/db";
import { ok, toErrorResponse } from "@/server/http";

/**
 * GET /api/admin/system/production-check — the owner's honest configuration
 * checklist. Dev-adapter flavour: checks the in-memory store configuration.
 * The real backend implements the same contract against its own config.
 */

interface ProductionCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const settings = getDb().settings;

    const checks: ProductionCheckItem[] = [
      {
        id: "store-profile",
        label: "Store profile",
        status: settings.name && settings.name !== "Mama Israel Collections" ? "pass" : "warn",
        detail:
          settings.name && settings.name !== "Mama Israel Collections"
            ? `Serving as "${settings.name}".`
            : "The store is still using the default name — add your own in Brand settings.",
      },
      {
        id: "whatsapp",
        label: "WhatsApp number",
        status: settings.whatsappNumber ? "pass" : "warn",
        detail: settings.whatsappNumber
          ? `Customer messages route to ${settings.whatsappNumber}.`
          : "No WhatsApp number configured — every WhatsApp button on the storefront is hidden.",
      },
      {
        id: "delivery",
        label: "Delivery rules",
        status:
          settings.delivery.flatFee !== null || (settings.delivery.zones?.length ?? 0) > 0
            ? "pass"
            : "warn",
        detail:
          settings.delivery.flatFee !== null || (settings.delivery.zones?.length ?? 0) > 0
            ? "Checkout shows a delivery fee (flat fee or matched zone)."
            : "No flat fee or zones configured — delivery is confirmed manually per order.",
      },
      {
        id: "payments",
        label: "Payment methods",
        status:
          settings.payments?.payOnDeliveryEnabled || settings.payments?.mpesa.enabled
            ? "pass"
            : "fail",
        detail:
          settings.payments?.payOnDeliveryEnabled || settings.payments?.mpesa.enabled
            ? [
                settings.payments?.payOnDeliveryEnabled ? "Pay on delivery is on." : null,
                settings.payments?.mpesa.enabled ? "M-Pesa is on." : null,
              ]
                .filter(Boolean)
                .join(" ")
            : "No payment method is enabled — customers cannot check out.",
      },
    ];

    const mpesa = settings.payments?.mpesa;
    if (mpesa?.enabled) {
      const hasChannel = (mpesa.tillEnabled && mpesa.tillNumber) || (mpesa.paybillEnabled && mpesa.paybillNumber);
      checks.push({
        id: "mpesa-channels",
        label: "M-Pesa payment details",
        status: hasChannel ? "pass" : "fail",
        detail: hasChannel
          ? "Till/Paybill details are configured for the checkout instructions."
          : "M-Pesa is enabled but neither a Till number nor a Paybill number has been entered.",
      });
    }

    const ok_ = checks.every((c) => c.status !== "fail");
    return ok({
      environment: "development",
      ok: ok_,
      checks,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
