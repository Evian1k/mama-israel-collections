import type { CartItem } from "@/types/cart";
import type { Order, Product } from "@/types";
import { formatPrice } from "./format";
import { effectivePrice } from "./product-utils";

/**
 * WhatsApp click-to-chat integration.
 *
 * The number is a store setting (Admin → Settings / NEXT_PUBLIC_WHATSAPP_NUMBER).
 * Nothing is hardcoded. When no number is configured, the UI hides WhatsApp
 * actions entirely (see `isWhatsAppConfigured`).
 */

export function isWhatsAppConfigured(raw?: string | null): boolean {
  return Boolean(normalizeWhatsAppNumber(raw));
}

/**
 * Returns digits-only international format for wa.me, or null if unusable.
 * Accepts "+254 712 345 678", "0712345678" (assumes Kenya), "254712345678".
 */
export function normalizeWhatsAppNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Local Kenyan format 07/01... -> 254...
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `254${digits.slice(1)}`;
  }
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

export function buildWhatsAppUrl(number: string | null | undefined, message: string): string | null {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

type ProductEnquiryOptions = {
  product: Pick<Product, "name" | "price" | "compareAtPrice">;
  size?: string | null;
  color?: string | null;
  quantity?: number;
  storeName: string;
  productUrl?: string;
};

export function productEnquiryMessage(opts: ProductEnquiryOptions): string {
  const { product, size, color, quantity, storeName, productUrl } = opts;
  const price = effectivePrice(product);
  const lines = [
    `Hello ${storeName}! 👋`,
    "",
    `I would like to enquire about this item:`,
    `• ${product.name} — ${formatPrice(price)}`,
  ];
  if (size) lines.push(`• Size: ${size}`);
  if (color) lines.push(`• Colour: ${color}`);
  if (quantity && quantity > 1) lines.push(`• Quantity: ${quantity}`);
  if (productUrl) lines.push(`• Link: ${productUrl}`);
  lines.push("", "Is it available?");
  return lines.join("\n");
}

export function cartOrderMessage(opts: {
  items: Pick<CartItem, "name" | "size" | "color" | "quantity" | "price">[];
  subtotal: number;
  storeName: string;
}): string {
  const { items, subtotal, storeName } = opts;
  const lines = [
    `Hello ${storeName}! 👋`,
    "",
    "I would like to place an order:",
    "",
  ];
  for (const item of items) {
    const variant = [item.size, item.color].filter(Boolean).join(" • ");
    lines.push(
      `${item.quantity} × ${item.name}${variant ? ` (${variant})` : ""} — ${formatPrice(item.price * item.quantity)}`
    );
  }
  lines.push("", `Subtotal: ${formatPrice(subtotal)}`, "", "Please confirm availability and delivery. Thank you!");
  return lines.join("\n");
}

export function orderFollowUpMessage(opts: { orderNumber: string; storeName: string }): string {
  return [
    `Hello ${opts.storeName}! 👋`,
    "",
    `I would like to ask about my order ${opts.orderNumber}.`,
  ].join("\n");
}

/**
 * Message the customer sends AFTER paying via M-Pesa (manual Till/Paybill
 * flow): confirms the transaction code so the owner can verify it against
 * their own M-Pesa records. Plain text only — no emojis in code.
 */
export function mpesaPaymentConfirmationMessage(opts: {
  orderNumber: string;
  amount: number;
  customerName: string;
  transactionCode: string;
  storeName: string;
}): string {
  return [
    `Hello ${opts.storeName}!`,
    "",
    "I have completed my M-Pesa payment.",
    `• Order number: ${opts.orderNumber}`,
    `• Amount: KSh ${opts.amount.toLocaleString("en-KE")}`,
    `• M-Pesa transaction code: ${opts.transactionCode}`,
    `• Name: ${opts.customerName}`,
    "",
    "Please verify the payment. Thank you!",
  ].join("\n");
}

export function generalEnquiryMessage(storeName: string): string {
  return `Hello ${storeName}! 👋 I have a question about your collection.`;
}
