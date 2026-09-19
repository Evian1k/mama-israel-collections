import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/types/order";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready: "Ready",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Tailwind classes per status — tuned for both storefront + admin surfaces */
export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-teal-100 text-teal-900 border-teal-200",
  processing: "bg-blue-50 text-sky-900 border-sky-200",
  ready: "bg-purple-50 text-purple-900 border-purple-200",
  shipped: "bg-stone-200 text-stone-900 border-stone-300",
  delivered: "bg-green-100 text-green-900 border-green-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
};

/** Dot colour used in timelines/pickers */
export const ORDER_STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-teal-600",
  processing: "bg-sky-600",
  ready: "bg-purple-600",
  shipped: "bg-stone-500",
  delivered: "bg-green-600",
  cancelled: "bg-red-600",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Awaiting verification",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-stone-100 text-stone-800 border-stone-200",
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  paid: "bg-green-100 text-green-900 border-green-200",
  refunded: "bg-purple-50 text-purple-900 border-purple-200",
  failed: "bg-red-100 text-red-900 border-red-200",
  cancelled: "bg-stone-200 text-stone-800 border-stone-300",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pay_on_delivery: "Pay on delivery",
  mpesa: "M-Pesa",
  card: "Card",
};

/** Human explanation of what each status means for the customer */
export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: "We received your order and will confirm it shortly.",
  confirmed: "Your order is confirmed. We are preparing it with care.",
  processing: "Your order is being packed right now.",
  ready: "Your order is ready — delivery or pick-up will be arranged.",
  shipped: "Your order is on the way to you.",
  delivered: "Your order has been delivered. Thank you for shopping with us!",
  cancelled: "This order was cancelled. Contact us if this looks wrong.",
};
