import { z } from "zod";

/**
 * Client-side mirror of the server's `productInputSchema`
 * (src/server/validation.ts) — the API is always the authority; this schema
 * only gives the owner instant inline feedback while editing.
 *
 * Amount/stock fields are held as text while typing (so decimals type
 * naturally) and validated as well-formed numbers here; the submit handler
 * converts them to the numbers the API expects. One deliberate client-side
 * addition: the sale-price refine (compareAtPrice must be lower than price).
 * Keep both schemas in lockstep when rules change.
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const AMOUNT_REGEX = /^\d{1,9}(\.\d{1,2})?$/;

/** KES amount: digits with optional cents; commas tolerated while pasting */
function amountInput(emptyMessage: string) {
  return z
    .string()
    .trim()
    .min(1, emptyMessage)
    .transform((v) => v.replace(/,/g, ""))
    .refine((v) => AMOUNT_REGEX.test(v), "Enter a valid amount, e.g. 4500 or 4500.50");
}

/** Optional sale price: empty string means "not on sale" */
const salePriceInput = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .refine((v) => v === "" || AMOUNT_REGEX.test(v), "Enter a valid amount, e.g. 5500")
  .refine((v) => v === "" || Number(v) > 0, "Sale price must be greater than zero")
  .refine((v) => v === "" || Number(v) <= 10_000_000, "Sale price is too large");

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .max(140, "Slug is too long")
    .regex(SLUG_REGEX, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  description: z
    .string()
    .trim()
    .min(10, "Please write a description (at least 10 characters)")
    .max(5000),
  categoryId: z.string().trim().min(1, "Choose a category"),
  price: amountInput("Enter a price")
    .refine((v) => Number(v) > 0, "Price must be greater than zero")
    .refine((v) => Number(v) <= 10_000_000, "Price is too large"),
  /** UI-only switch — controls whether a sale price applies (stripped on submit) */
  onSale: z.boolean(),
  compareAtPrice: salePriceInput,
  sku: z
    .string()
    .trim()
    .max(40, "SKU is too long")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        alt: z.string().trim().max(200),
        isPrimary: z.boolean(),
        sortOrder: z.number().int().min(0),
      })
    )
    .max(10, "A product can have at most 10 images"),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20, "A product can have at most 20 sizes"),
  colors: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Colour name is required").max(40),
        hex: z.string().trim().regex(HEX_COLOR_REGEX, "Colour must be a valid hex value like #7A2235"),
      })
    )
    .max(20, "A product can have at most 20 colours"),
  stockQuantity: z
    .string()
    .trim()
    .min(1, "Enter a stock quantity")
    .refine((v) => /^\d{1,6}$/.test(v), "Stock must be a whole number")
    .refine((v) => Number(v) <= 100_000, "Stock is too large"),
  lowStockThreshold: z
    .string()
    .trim()
    .min(1, "Enter a low-stock threshold")
    .refine((v) => /^\d{1,5}$/.test(v), "Must be a whole number")
    .refine((v) => Number(v) <= 10_000, "Threshold is too large"),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  isActive: z.boolean(),
}).superRefine((data, ctx) => {
  const price = Number(data.price);
  const compareAt = Number(data.compareAtPrice);
  if (data.onSale && data.compareAtPrice !== "" && Number.isFinite(price) && price > 0 && compareAt >= price) {
    ctx.addIssue({
      code: "custom",
      path: ["compareAtPrice"],
      message: "Sale price must be lower than the price",
    });
  }
});

/** Form values — identical before and after validation (field values are strings) */
export type ProductFormValues = z.output<typeof productFormSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;

/** One entry in the product image list (mirrors Omit<ProductImage, "id">) */
export interface ProductFormImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

/** Matches the dev-store slugify logic (src/server/dev-store/ids.ts) */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
