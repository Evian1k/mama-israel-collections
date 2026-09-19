import { z } from "zod";
import { ApiError } from "./errors";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "../shared/api-types";

/**
 * ============================================================================
 * VALIDATION — Zod schemas mirroring the frontend (src/server/validation.ts)
 * ============================================================================
 * The API is the authority: every request body, query and param is validated
 * here before touching the database. Error responses match the shared envelope
 * with code VALIDATION_ERROR and per-issue details.
 * ============================================================================
 */

const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const colorSchema = z.object({
  name: z.string().trim().min(1, "Colour name is required").max(40),
  hex: z.string().trim().regex(hexColor, "Colour must be a valid hex value like #7A2235"),
});

export const productVariantInputSchema = z.object({
  size: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  stock: z.number().int("Variant stock must be a whole number").min(0).max(100_000),
  sku: z.string().trim().max(40).optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Please write a description (at least 10 characters)")
    .max(5000),
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
  variants: z.array(productVariantInputSchema).max(200).optional(),
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

export const placeOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1),
          size: z.string().trim().max(20).nullable(),
          color: z.string().trim().max(40).nullable(),
          quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(1, "Quantity must be at least 1")
            .max(99),
        })
      )
      .min(1, "Your cart is empty")
      .max(50),
    customer: orderCustomerSchema,
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    // Manual M-Pesa: the transaction code from the customer's payment SMS.
    // Normalised (trimmed, uppercased, spaces stripped) before the regex.
    mpesaTransactionCode: z
      .string()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .refine((v) => /^[A-Z0-9]{8,15}$/.test(v), {
        message: "Enter the M-Pesa transaction code from your payment confirmation SMS.",
      })
      .optional(),
  })
  .refine(
    (data) => data.paymentMethod !== "mpesa" || (data.mpesaTransactionCode ?? "") !== "",
    {
      message: "Enter the M-Pesa transaction code from your payment confirmation SMS.",
    }
  );

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

/** Audited admin payment-status update (POST /api/admin/orders/:id/payment-status) */
export const paymentStatusUpdateSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  note: z.string().trim().max(300).optional(),
});

/** Admin onboarding: change the bootstrap password (and optionally the email). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters.")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
        message: "Include both letters and numbers in your new password.",
      }),
    email: z.string().trim().email("Enter a valid email address").optional(),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Choose a password you have not used before.",
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
      (v) =>
        v === "" || /^(?:\+?254|0)(?:7|1)\d{8}$|^\+?\d{9,15}$/.test(v.replace(/[\s-]/g, "")),
      "Use a valid phone number, e.g. 254712345678"
    )
    .optional(),
  logoUrl: z
    .union([z.string().trim().url("Enter a valid image URL").max(500), z.literal("")])
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
      zones: z
        .array(
          z.object({
            id: z.string().trim().min(1).max(40),
            name: z.string().trim().min(1).max(60),
            fee: z.number().min(0).max(100_000),
          })
        )
        .max(20)
        .optional(),
    })
    .optional(),
  payments: z
    .object({
      payOnDeliveryEnabled: z.boolean().optional(),
      mpesa: z
        .object({
          enabled: z.boolean().optional(),
          businessName: z.string().trim().max(120).optional(),
          tillEnabled: z.boolean().optional(),
          tillNumber: z
            .union([z.string().trim().regex(/^[0-9]{5,12}$/, "Enter the Till number (digits only)"), z.literal("")])
            .optional(),
          paybillEnabled: z.boolean().optional(),
          paybillNumber: z
            .union([z.string().trim().regex(/^[0-9]{5,12}$/, "Enter the Paybill number (digits only)"), z.literal("")])
            .optional(),
          accountNumber: z.string().trim().max(120).optional(),
          instructions: z.string().trim().max(1000).optional(),
        })
        .optional(),
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
  message: z
    .string()
    .trim()
    .min(10, "Please write a short message (at least 10 characters)")
    .max(2000),
});

export const mpesaStkPushSchema = z.object({
  orderNumber: z.string().trim().min(4).max(24),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => kePhone.test(v), "Enter a valid Kenyan phone number, e.g. 0712 345 678"),
});

/** Parse helper — throws ApiError(400) with readable messages */
export function parseOrThrow<S extends z.ZodType>(schema: S, payload: unknown): z.output<S> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first?.message ?? "Please check the highlighted fields and try again.";
    throw ApiError.validation(message, result.error.issues);
  }
  return result.data;
}
