import type { Order } from "./order";

/**
 * Customers are derived from orders (no separate customer accounts in
 * Phase 1). The backend computes these aggregates in Phase 2.
 */
export interface CustomerSummary {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  ordersCount: number;
  totalSpent: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  deliveryLocations: string[];
}

export interface CustomerDetail extends CustomerSummary {
  orders: Order[];
}
