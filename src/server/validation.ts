import { z } from "zod";
import { ApiError } from "@/services/api/client";
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from "@/types/order";

/**
 * Shared Zod validation schemas (server-side). The client mirrors a subset of
 * these in checkout/product forms for instant feedback, but the API is always
 * the authority — a principle that carries unchanged into Phase 2.
 */

const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const colorSchema = z.object({
  name: z.string().trim().min(1, "Colour name is required").max(40),
  hex: z.string().trim().regex(hexColor, "Colour must be a valid hex value like #7A2235"),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  description: z.string().trim().min(10, "Please write a description (at least 10 characters)").max(5000),
  categoryId: z.string().trim().min(1, "Choose a category"),
  price: z.number().positive("Price must be greater than zero").max(10_000_000),
  compareAtPrice: z.number().positive().max(10_000_000).nullable().optional(),
  sku: z.string().trim().max(40).optional(),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        alt: z.string().trim().max(200).default(""),
        isPrimary: z.boolean().default(false),
        sortOrder: z.number().int().min(0).default(0),
      })
    )
    .max(10, "A product can have at most 10 images")
    .optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  colors: z.array(colorSchema).max(20).optional(),
  stockQuantity: z.number().int("Stock must be a whole number").min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(60),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

/** Kenyan phone numbers: 07XX / 01XX / +254 7XX / 254 7XX */
const kePhone = /^(?:\+?254|0)(?:7|1)\d{8}$/;

export const orderCustomerSchema = z.object({
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

/** M-Pesa transaction code: 8-15 letters/digits (from the confirmation SMS) */
export const mpesaTransactionCodeSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine(
    (v) => /^[A-Z0-9]{8,15}$/.test(v),
    "Enter the transaction code from your M-Pesa SMS (e.g. QGH7JK3N2P)."
  );

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        size: z.string().trim().max(20).nullable(),
        color: z.string().trim().max(40).nullable(),
        quantity: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(99),
      })
    )
    .min(1, "Your cart is empty")
    .max(50),
  customer: orderCustomerSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  // Required (server-verified) when paymentMethod is "mpesa"
  mpesaTransactionCode: mpesaTransactionCodeSchema.optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

/** POST /api/admin/orders/:id/payment-status — audited payment verification */
export const paymentStatusUpdateSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().max(300).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** POST /api/admin/account/change-password */
export const changeCredentialsSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .refine(
      (v) => /^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(v),
      "Choose a password of at least 10 characters including letters and numbers."
    ),
  email: z
    .union([z.string().trim().email("Enter a valid email address"), z.literal("")])
    .optional(),
});

export const settingsPatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  shortName: z.string().trim().max(40).optional(),
  tagline: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional(),
  email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]).optional(),
  phone: z.string().trim().max(24).optional(),
  whatsappNumber: z
    .string()
    .trim()
    .max(24)
    .refine(
      (v) => v === "" || /^(?:\+?254|0)(?:7|1)\d{8}$|^\+?\d{9,15}$/.test(v.replace(/[\s-]/g, "")),
      "Use a valid phone number, e.g. 254712345678"
    )
    .optional(),
  location: z.string().trim().max(200).optional(),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(200).optional(),
      facebook: z.string().trim().max(200).optional(),
      tiktok: z.string().trim().max(200).optional(),
      twitter: z.string().trim().max(200).optional(),
    })
    .optional(),
  delivery: z
    .object({
      flatFee: z.number().min(0).max(100_000).nullable().optional(),
      freeAboveThreshold: z.number().min(0).max(10_000_000).nullable().optional(),
      note: z.string().trim().max(300).optional(),
    })
    .optional(),
  payments: z
    .object({
      payOnDeliveryEnabled: z.boolean(),
      mpesa: z.object({
        enabled: z.boolean(),
        businessName: z.string().trim().max(80),
        tillEnabled: z.boolean(),
        tillNumber: z
          .string()
          .trim()
          .refine((v) => v === "" || /^\d{5,15}$/.test(v), "Enter a till number (digits only)"),
        paybillEnabled: z.boolean(),
        paybillNumber: z
          .string()
          .trim()
          .refine((v) => v === "" || /^\d{5,15}$/.test(v), "Enter a paybill number (digits only)"),
        accountNumber: z.string().trim().max(60),
        instructions: z.string().trim().max(1000),
      }),
    })
    .optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(24).optional(),
  message: z.string().trim().min(10, "Please write a short message (at least 10 characters)").max(2000),
});

export const devDataSchema = z.object({
  action: z.enum(["seed-sample", "clear-sample", "reset"]),
});

/** Parse helper — throws ApiError(422/400) with readable messages */
export function parseOrThrow<S extends z.ZodType>(schema: S, payload: unknown): z.output<S> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.issues[0];
    const message =
      first?.message ?? "Please check the highlighted fields and try again.";
    throw new ApiError(message, 400, "VALIDATION_ERROR", result.error.issues);
  }
  return result.data;
}
