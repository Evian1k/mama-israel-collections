import { formatPrice } from "@/lib/format";
import type { StoreDeliverySettings, StoreDeliveryZone } from "@/types";

/**
 * Display helpers shared by the cart and checkout summary cards.
 * All totals computed here are DISPLAY ONLY — the server recomputes the
 * authoritative figures when the order is placed.
 */

export interface DeliveryDisplay {
  /** "FREE" | "KSh 300" | "To be confirmed" */
  label: string;
  /** Numeric fee used in total estimates; null when delivery is unconfirmed */
  fee: number | null;
  /** False when the shop has no flat fee configured yet */
  confirmed: boolean;
  /** True when the fee comes from a matching delivery zone */
  zoneMatch: boolean;
}

/**
 * Mirrors the server's location normalisation (createOrder): zone names are
 * matched after trimming, lowercasing and collapsing internal whitespace.
 */
export function normaliseLocation(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Find the delivery zone that matches a free-text location, if any.
 * Shared by the checkout zone chips and the fee estimate.
 */
export function matchDeliveryZone(
  location: string | null | undefined,
  zones?: StoreDeliveryZone[] | null
): StoreDeliveryZone | undefined {
  const normalised = normaliseLocation(location ?? "");
  if (!normalised) return undefined;
  return (zones ?? []).find((zone) => normaliseLocation(zone.name) === normalised);
}

/**
 * Mirrors the server's delivery-fee logic (see createOrder): a zone whose
 * name matches the delivery location wins; otherwise the flat fee applies
 * (waived above the free-delivery threshold); no flat fee configured →
 * "to be confirmed".
 */
export function deliveryDisplay(
  subtotal: number,
  delivery?: StoreDeliverySettings | null,
  location?: string | null
): DeliveryDisplay {
  const zone = matchDeliveryZone(location, delivery?.zones);
  if (zone) {
    return {
      label: zone.fee === 0 ? "FREE" : formatPrice(zone.fee),
      fee: zone.fee,
      confirmed: true,
      zoneMatch: true,
    };
  }
  if (!delivery || delivery.flatFee == null) {
    return { label: "To be confirmed", fee: null, confirmed: false, zoneMatch: false };
  }
  if (delivery.freeAboveThreshold != null && subtotal >= delivery.freeAboveThreshold) {
    return { label: "FREE", fee: 0, confirmed: true, zoneMatch: false };
  }
  return {
    label: formatPrice(delivery.flatFee),
    fee: delivery.flatFee,
    confirmed: true,
    zoneMatch: false,
  };
}

/** "M • Wine" style variant text; empty string when the item has neither */
export function variantLabel(
  size: string | null | undefined,
  color: string | null | undefined
): string {
  return [size, color].filter(Boolean).join(" • ");
}
