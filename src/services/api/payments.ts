import { apiRequest } from "./client";

/**
 * Public checkout payment availability — GET /api/payments/methods.
 *
 * The storefront builds its payment options strictly from this payload:
 * only the methods the owner has enabled are offered. The public store
 * settings response never contains payment configuration, so this endpoint
 * is the single source of truth for what the customer can choose.
 */
export interface CheckoutPaymentMethods {
  payOnDelivery: boolean;
  mpesa: {
    enabled: boolean;
    /** Business name shown on the checkout payment instructions */
    businessName: string;
    /** Present only when the Till channel is active */
    tillNumber?: string;
    /** Present only when the Paybill channel is active */
    paybillNumber?: string;
    /** Present only when the Paybill channel is active (may be "") */
    accountNumber?: string;
    /** Owner's custom instructions (only present when non-empty) */
    instructions?: string;
  };
}

/**
 * Payments API — storefront surface.
 * Mirrors: GET /api/payments/methods
 * (The retired Daraja STK-push flow has been removed from the UI.)
 */
export const paymentsApi = {
  methods(signal?: AbortSignal): Promise<CheckoutPaymentMethods> {
    return apiRequest<CheckoutPaymentMethods>("/api/payments/methods", { signal });
  },
};
