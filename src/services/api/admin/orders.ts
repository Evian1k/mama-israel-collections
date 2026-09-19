import { apiRequest } from "../client";
import type { Order, OrderStatus, Paginated, PaymentStatus } from "@/types";

export interface AdminOrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  search?: string;
}

/** Admin orders API — /api/admin/orders */
export const adminOrdersApi = {
  list(token: string, query: AdminOrderQuery = {}, signal?: AbortSignal): Promise<Paginated<Order>> {
    return apiRequest<Paginated<Order>>("/api/admin/orders", {
      authToken: token,
      params: {
        page: query.page,
        limit: query.limit,
        status: query.status && query.status !== "all" ? query.status : undefined,
        paymentStatus:
          query.paymentStatus && query.paymentStatus !== "all" ? query.paymentStatus : undefined,
        search: query.search,
      },
      signal,
    });
  },

  /** Accepts the order id or order number */
  get(token: string, idOrNumber: string, signal?: AbortSignal): Promise<Order> {
    return apiRequest<Order>(`/api/admin/orders/${encodeURIComponent(idOrNumber)}`, {
      authToken: token,
      signal,
    });
  },

  /** PATCH /api/admin/orders/:id/status */
  updateStatus(
    token: string,
    id: string,
    input: { status: OrderStatus; note?: string }
  ): Promise<Order> {
    return apiRequest<Order>(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      authToken: token,
      body: input,
    });
  },

  /**
   * POST /api/admin/orders/:id/payment-status — audited payment verification
   * (e.g. marking an M-Pesa code as Paid after checking it against the
   * owner's own M-Pesa records). Returns the updated order.
   */
  setPaymentStatus(
    token: string,
    id: string,
    input: { status: PaymentStatus; note?: string }
  ): Promise<Order> {
    return apiRequest<Order>(`/api/admin/orders/${encodeURIComponent(id)}/payment-status`, {
      method: "POST",
      authToken: token,
      body: input,
    });
  },
};
