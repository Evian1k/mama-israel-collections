import { prisma } from "../../lib/prisma";
import {
  DEFAULT_DELIVERY,
  DEFAULT_PAYMENTS,
  DEFAULT_SOCIAL_LINKS,
  mapStoreSettings,
  normalisePayments,
  normaliseZones,
} from "../../lib/mappers";
import type { Prisma } from "@prisma/client";
import type {
  StorePaymentsSettings,
  StoreSettings,
  StoreSocialLinks,
  StoreDeliverySettings,
} from "../../shared/api-types";
import type { settingsPatchSchema } from "../../lib/validation";
import type { z } from "zod";

/**
 * Store settings — the business profile lives in the database (single row,
 * id "main"), seeded with brand defaults on first read. Nothing business-
 * specific is hardcoded anywhere else in the codebase.
 */

export const SETTINGS_ROW_ID = "main";

const DEFAULT_SETTINGS = {
  id: SETTINGS_ROW_ID,
  name: "Mama Israel Collections",
  shortName: "Mama Israel",
  tagline: "Style • Elegance • You",
  description:
    "Thoughtfully curated women's fashion from Kenya — dresses, tops, skirts and more, chosen to make every woman feel confident and beautifully herself.",
  email: "",
  phone: "",
  whatsappNumber: "",
  location: "",
  socialLinks: DEFAULT_SOCIAL_LINKS as unknown as Prisma.InputJsonValue,
  currency: "KES",
  currencySymbol: "KSh",
  currencyLocale: "en-KE",
  delivery: DEFAULT_DELIVERY as unknown as Prisma.InputJsonValue,
  lowStockThreshold: 3,
};

export async function getSettingsRow() {
  const existing = await prisma.storeSettings.findUnique({ where: { id: SETTINGS_ROW_ID } });
  if (existing) return existing;
  // Create-on-first-read (idempotent under races thanks to the pk constraint)
  try {
    return await prisma.storeSettings.create({ data: DEFAULT_SETTINGS });
  } catch {
    return prisma.storeSettings.findUniqueOrThrow({ where: { id: SETTINGS_ROW_ID } });
  }
}

export async function getSettings(): Promise<StoreSettings> {
  return mapStoreSettings(await getSettingsRow());
}

// ------------------------------ Payment methods -----------------------------

/** Public checkout payment info — the ONLY place payment details are exposed. */
export interface PublicPaymentMethods {
  payOnDelivery: boolean;
  mpesa: {
    enabled: boolean;
    businessName: string;
    tillNumber: string;
    paybillNumber: string;
    accountNumber: string;
    instructions: string;
  };
}

/** Effective M-Pesa availability: master switch AND at least one active destination. */
export function mpesaEffectivelyEnabled(payments: StorePaymentsSettings): boolean {
  const { mpesa } = payments;
  return (
    mpesa.enabled &&
    ((mpesa.tillEnabled && mpesa.tillNumber !== "") ||
      (mpesa.paybillEnabled && mpesa.paybillNumber !== ""))
  );
}

/**
 * Build the public GET /api/payments/methods payload. Numbers are only
 * included when their channel is enabled; everything is blanked when M-Pesa
 * is not effectively available (same shape, no details).
 */
export async function getPaymentMethods(): Promise<PublicPaymentMethods> {
  const settings = await getSettings();
  const payments = settings.payments ?? DEFAULT_PAYMENTS;
  const { mpesa } = payments;
  const enabled = mpesaEffectivelyEnabled(payments);
  const tillActive = enabled && mpesa.tillEnabled && mpesa.tillNumber !== "";
  const paybillActive = enabled && mpesa.paybillEnabled && mpesa.paybillNumber !== "";

  return {
    payOnDelivery: payments.payOnDeliveryEnabled,
    mpesa: {
      enabled,
      businessName: enabled ? mpesa.businessName : "",
      tillNumber: tillActive ? mpesa.tillNumber : "",
      paybillNumber: paybillActive ? mpesa.paybillNumber : "",
      accountNumber: paybillActive ? mpesa.accountNumber : "",
      instructions: enabled && mpesa.instructions !== "" ? mpesa.instructions : "",
    },
  };
}

export async function updateSettings(
  input: z.output<typeof settingsPatchSchema>
): Promise<StoreSettings> {
  const current = await getSettingsRow();
  const currentSocial = { ...DEFAULT_SOCIAL_LINKS, ...(current.socialLinks as object) };
  const currentDelivery = { ...DEFAULT_DELIVERY, ...(current.delivery as object) };
  const currentZones = normaliseZones(currentDelivery.zones);

  const socialLinks: StoreSocialLinks =
    input.socialLinks !== undefined
      ? { ...currentSocial, ...input.socialLinks }
      : currentSocial;

  const delivery: StoreDeliverySettings =
    input.delivery !== undefined
      ? {
          flatFee:
            input.delivery.flatFee !== undefined ? input.delivery.flatFee : currentDelivery.flatFee,
          freeAboveThreshold:
            input.delivery.freeAboveThreshold !== undefined
              ? input.delivery.freeAboveThreshold
              : currentDelivery.freeAboveThreshold,
          note:
            input.delivery.note !== undefined ? input.delivery.note : currentDelivery.note,
          // Zones replace the whole array when provided (the UI edits the full list).
          zones: input.delivery.zones !== undefined ? normaliseZones(input.delivery.zones) : currentZones,
        }
      : { ...currentDelivery, zones: currentZones };

  const currentPayments = normalisePayments(current.payments);
  const payments: StorePaymentsSettings =
    input.payments !== undefined
      ? {
          payOnDeliveryEnabled:
            input.payments.payOnDeliveryEnabled ?? currentPayments.payOnDeliveryEnabled,
          mpesa: {
            enabled: input.payments.mpesa?.enabled ?? currentPayments.mpesa.enabled,
            businessName:
              input.payments.mpesa?.businessName ?? currentPayments.mpesa.businessName,
            tillEnabled: input.payments.mpesa?.tillEnabled ?? currentPayments.mpesa.tillEnabled,
            tillNumber: input.payments.mpesa?.tillNumber ?? currentPayments.mpesa.tillNumber,
            paybillEnabled:
              input.payments.mpesa?.paybillEnabled ?? currentPayments.mpesa.paybillEnabled,
            paybillNumber:
              input.payments.mpesa?.paybillNumber ?? currentPayments.mpesa.paybillNumber,
            accountNumber:
              input.payments.mpesa?.accountNumber ?? currentPayments.mpesa.accountNumber,
            instructions:
              input.payments.mpesa?.instructions ?? currentPayments.mpesa.instructions,
          },
        }
      : currentPayments;

  const data: Prisma.StoreSettingsUpdateInput = {
    socialLinks: socialLinks as unknown as Prisma.InputJsonValue,
    delivery: delivery as unknown as Prisma.InputJsonValue,
    payments: payments as unknown as Prisma.InputJsonValue,
  };
  if (input.name !== undefined) data.name = input.name;
  if (input.shortName !== undefined) data.shortName = input.shortName;
  if (input.tagline !== undefined) data.tagline = input.tagline;
  if (input.description !== undefined) data.description = input.description;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.whatsappNumber !== undefined) {
    // Store as international digits without "+" (matches the frontend contract)
    data.whatsappNumber = input.whatsappNumber.replace(/[+\s-]/g, "");
  }
  if (input.logoUrl !== undefined) {
    data.logoUrl = input.logoUrl === "" ? null : input.logoUrl;
  }
  if (input.location !== undefined) data.location = input.location;
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;

  const updated = await prisma.storeSettings.update({
    where: { id: SETTINGS_ROW_ID },
    data,
  });
  return mapStoreSettings(updated);
}
