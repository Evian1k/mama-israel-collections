import { apiRequest } from "./client";
import type { Order, PlaceOrderInput } from "@/types";

/**
 * Orders API — storefront surface.
 * Mirrors: POST /api/orders, GET /api/orders/:orderNumber
 *
 * The server re-prices every item and validates stock, so the totals returned
 * in the created Order are the source of truth (never trust client math).
 */
export const ordersApi = {
  place(input: PlaceOrderInput, signal?: AbortSignal): Promise<Order> {
    return apiRequest<Order>("/api/orders", { method: "POST", body: input, signal });
  },

  getByOrderNumber(orderNumber: string, signal?: AbortSignal): Promise<Order> {
    return apiRequest<Order>(
      `/api/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}`,
      { signal }
    );
  },
};
