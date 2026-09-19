import { Prisma } from "@prisma/client";

/**
 * Pricing helpers — mirror src/lib/product-utils.ts so the server's price
 * math is identical to what shoppers saw in the cart (the server remains
 * authoritative at checkout).
 */

export type PriceLike = { price: Prisma.Decimal; compareAtPrice: Prisma.Decimal | null };

/** The price the shopper pays: sale price when a valid compareAtPrice exists. */
export function effectivePrice(product: PriceLike): number {
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const base = Number(product.price);
  if (compare !== null && compare > 0 && compare < base) return compare;
  return base;
}

/** SQL expression returning the effective price — used for filters and sorting. */
export const EFFECTIVE_PRICE_SQL = Prisma.sql`
  (CASE
    WHEN "p"."compareAtPrice" IS NOT NULL
         AND "p"."compareAtPrice" > 0
         AND "p"."compareAtPrice" < "p"."price"
      THEN "p"."compareAtPrice"
    ELSE "p"."price"
  END)
`;
