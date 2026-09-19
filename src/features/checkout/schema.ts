import { z } from "zod";

/**
 * Client-side mirror of the server's `orderCustomerSchema`
 * (src/server/validation.ts). The API is always the authority — this schema
 * exists only to give shoppers instant, inline feedback while typing.
 *
 * Keep both schemas in lockstep when validation rules change.
 */

/**
 * Kenyan mobile numbers only (Safaricom/Airtel/Telkom 07xx / 01xx ranges),
 * exactly like the server's mpesaStkPushSchema. Exported so the M-Pesa
 * number input validates with the same rule.
 */
export const kePhone = /^(?:\+?254|0)(?:7|1)\d{8}$/;

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(3, "Please enter your full name").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => kePhone.test(v), "Enter a valid Kenyan phone number, e.g. 0712 345 678"),
  email: z
    .union([z.string().trim().email("Enter a valid email address"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  deliveryLocation: z.string().trim().min(3, "Tell us where to deliver (town/estate)").max(160),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : undefined)),
});

/** Pre-transform values bound to the form inputs */
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;

/** Cleaned values after validation — exactly what the orders API expects */
export type CheckoutFormValues = z.output<typeof checkoutFormSchema>;
