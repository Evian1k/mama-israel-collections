import type { Product, ProductImage } from "@/types";

/** The price the shopper pays: sale price if a valid compareAtPrice exists. */
export function effectivePrice(product: Pick<Product, "price" | "compareAtPrice">): number {
  if (
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > 0 &&
    product.compareAtPrice < product.price
  ) {
    return product.compareAtPrice;
  }
  return product.price;
}

export function hasDiscount(product: Pick<Product, "price" | "compareAtPrice">): boolean {
  return effectivePrice(product) !== product.price;
}

export function discountPercent(product: Pick<Product, "price" | "compareAtPrice">): number | null {
  if (!hasDiscount(product) || product.price <= 0) return null;
  const pct = Math.round(((product.price - effectivePrice(product)) / product.price) * 100);
  return pct > 0 ? pct : null;
}

export function isOutOfStock(product: Pick<Product, "stockQuantity">): boolean {
  return product.stockQuantity <= 0;
}

export function isLowStock(
  product: Pick<Product, "stockQuantity" | "lowStockThreshold">
): boolean {
  return !isOutOfStock(product) && product.stockQuantity <= product.lowStockThreshold;
}

export function sortedImages(product: Pick<Product, "images">): ProductImage[] {
  return [...product.images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export function primaryImage(product: Pick<Product, "images">): ProductImage | null {
  return sortedImages(product)[0] ?? null;
}

export function secondaryImage(product: Pick<Product, "images">): ProductImage | null {
  return sortedImages(product)[1] ?? null;
}

export function productUrl(product: Pick<Product, "slug">): string {
  return `/products/${product.slug}`;
}

/** Human description of availability used across cards and the PDP */
export function stockLabel(product: Pick<Product, "stockQuantity" | "lowStockThreshold">): {
  tone: "in_stock" | "low_stock" | "out_of_stock";
  label: string;
} {
  if (isOutOfStock(product)) return { tone: "out_of_stock", label: "Out of stock" };
  if (isLowStock(product)) return { tone: "low_stock", label: `Only ${product.stockQuantity} left` };
  return { tone: "in_stock", label: "In stock" };
}
