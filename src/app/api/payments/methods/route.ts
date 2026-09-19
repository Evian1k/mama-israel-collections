import { getDb } from "@/server/dev-store/db";
import { ok, toErrorResponse } from "@/server/http";
import type { CheckoutPaymentMethods } from "@/services/api/payments";

/**
 * GET /api/payments/methods — public payment availability for checkout.
 * Derived from the owner's Admin → Settings → Payments configuration.
 * The public store settings response never exposes payment details, so this
 * endpoint is the customers' single source of truth.
 */
export async function GET() {
  try {
    const payments = getDb().settings.payments;
    const mpesa = payments?.mpesa;

    const payload: CheckoutPaymentMethods = {
      payOnDelivery: payments?.payOnDeliveryEnabled ?? true,
      mpesa: {
        enabled: mpesa?.enabled ?? false,
        businessName: mpesa?.businessName ?? "",
        ...(mpesa?.tillEnabled && mpesa.tillNumber ? { tillNumber: mpesa.tillNumber } : {}),
        ...(mpesa?.paybillEnabled && mpesa.paybillNumber
          ? { paybillNumber: mpesa.paybillNumber, accountNumber: mpesa.accountNumber ?? "" }
          : {}),
        ...(mpesa?.instructions ? { instructions: mpesa.instructions } : {}),
      },
    };

    return ok(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
