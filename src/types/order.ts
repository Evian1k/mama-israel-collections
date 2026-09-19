/** Canonical order lifecycle — see docs/BACKEND_IMPLEMENTATION_PLAN.md */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "refunded",
  "failed",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Payment architecture:
 * - `pay_on_delivery` — cash collected when the order arrives.
 * - `mpesa` — the customer pays via Lipa na M-Pesa (Till/Paybill) and submits
 *   the transaction code at checkout; the store owner verifies it manually
 *   (paymentStatus starts as "pending" = awaiting verification).
 * - `card` is modelled for a future processor integration.
 */
export const PAYMENT_METHODS = ["pay_on_delivery", "mpesa", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderCustomerInfo {
  fullName: string;
  phone: string;
  email?: string;
  deliveryLocation: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string | null;
  size: string | null;
  color: string | null;
  /** Unit price captured at order time (KES) */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export interface Order {
  id: string;
  /** Human-friendly, e.g. "MIC-2506-0042" */
  orderNumber: string;
  customer: OrderCustomerInfo;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** M-Pesa only — the code the customer submitted at checkout (if any) */
  mpesaTransactionCode?: string | null;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderItemInput {
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

export interface PlaceOrderInput {
  items: PlaceOrderItemInput[];
  customer: OrderCustomerInfo;
  paymentMethod?: PaymentMethod;
  /**
   * Required when paymentMethod is "mpesa": the M-Pesa transaction code from
   * the customer's confirmation SMS (8–15 letters/digits, auto-uppercased,
   * spaces stripped). The server rejects missing/invalid/duplicate codes.
   */
  mpesaTransactionCode?: string;
}

/** Server-reported problem when an order cannot be placed as requested */
export interface OrderRejectedItem {
  index: number;
  productName?: string;
  reason: "not_found" | "inactive" | "out_of_stock" | "invalid_variant" | "price_changed" | "insufficient_stock";
  message: string;
}
