import type { ProductVariantSelection } from "./product";

/**
 * A cart line is uniquely identified by product + size + colour.
 * Prices are snapshotted when added; the server re-validates at checkout.
 */
export interface CartItem {
  /** `${productId}::${size}::${color}` */
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
  /** Unit price (effective/sale price) at add-to-cart time, KES */
  price: number;
  compareAtPrice?: number | null;
  size: string | null;
  color: string | null;
  quantity: number;
  /** Stock snapshot — used to clamp quantity inputs in the cart UI */
  maxQuantity: number;
  sku?: string;
}

export type AddToCartInput = Pick<CartItem, "productId" | "slug" | "name" | "price"> &
  Partial<Pick<CartItem, "imageUrl" | "compareAtPrice" | "size" | "color" | "maxQuantity" | "sku">> &
  Pick<ProductVariantSelection, "quantity">;
