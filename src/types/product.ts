import type { Category } from "./category";

export interface ProductColor {
  /** Display name, e.g. "Burgundy" */
  name: string;
  /** Hex value for swatches, e.g. "#7A2235" */
  hex: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  /** Populated by the API for convenience (join result) */
  category?: Category | null;
  /** Current selling price in KES */
  price: number;
  /** Optional "was" price that enables sale display */
  compareAtPrice: number | null;
  sku: string;
  images: ProductImage[];
  /** Available size labels, e.g. ["S", "M", "L"] */
  sizes: string[];
  colors: ProductColor[];
  stockQuantity: number;
  /** Below or equal to this, product shows a "low stock" badge */
  lowStockThreshold: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Variant selection made by a shopper */
export interface ProductVariantSelection {
  size: string | null;
  color: string | null;
  quantity: number;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string;
  images?: Array<Omit<ProductImage, "id">>;
  sizes?: string[];
  colors?: ProductColor[];
  stockQuantity: number;
  lowStockThreshold?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "featured";

export interface ProductQuery {
  page?: number;
  limit?: number;
  /** Free text search across name, description and SKU */
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Multiple allowed — matched with OR */
  sizes?: string[];
  colors?: string[];
  sort?: ProductSort;
  featured?: boolean;
  newArrival?: boolean;
  /** Only products with stock > 0 */
  inStock?: boolean;
  /** Admin only: include inactive products */
  includeInactive?: boolean;
}
