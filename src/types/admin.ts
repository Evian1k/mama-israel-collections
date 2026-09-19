import type { Order } from "./order";
import type { Product } from "./product";
import type { Category } from "./category";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
}

export interface AdminSession {
  token: string;
  user: AdminUser;
  /**
   * True when the account still uses the initial setup password — the admin
   * shell forces a password change before any other screen. Always present in
   * fresh responses; older persisted sessions may lack it (treated as false).
   */
  mustChangePassword: boolean;
}

export interface OrderStatusCounts {
  pending: number;
  confirmed: number;
  processing: number;
  ready: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface DashboardStats {
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    byStatus: OrderStatusCounts;
    /** Sum of order totals excluding cancelled orders, KES */
    revenue: number;
  };
  customers: {
    total: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
  categories: {
    total: number;
  };
}

export interface OrdersByDayPoint {
  /** ISO date, e.g. "2025-06-12" */
  date: string;
  orderCount: number;
  revenue: number;
}

export interface CategoryProductCount {
  categoryId: string;
  categoryName: string;
  productCount: number;
  inStockCount: number;
}

export interface AnalyticsData {
  ordersByDay: OrdersByDayPoint[];
  topCategories: CategoryProductCount[];
  averageOrderValue: number;
  fulfilmentRate: number;
  cancellationRate: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
  }>;
}

export interface NewsletterSubscriber {
  email: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
}

export type { Category };
