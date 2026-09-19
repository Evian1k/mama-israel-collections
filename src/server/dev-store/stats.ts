import { getDb } from "./db";
import { isoDayKey } from "@/lib/format";
import type {
  AnalyticsData,
  CategoryProductCount,
  DashboardStats,
  OrderStatusCounts,
  OrdersByDayPoint,
} from "@/types";
import { ORDER_STATUSES } from "@/types/order";

/** Dashboard aggregates — computed from real data; zeros when the store is empty */

export function computeDashboardStats(): DashboardStats {
  const db = getDb();

  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0])
  ) as unknown as OrderStatusCounts;

  let revenue = 0;
  for (const order of db.orders) {
    byStatus[order.status] += 1;
    if (order.status !== "cancelled") revenue += order.total;
  }

  const activeProducts = db.products.filter((p) => p.isActive);
  const lowStockThresholdDefault = db.settings.lowStockThreshold;

  const lowStockProducts = db.products
    .filter(
      (p) =>
        p.stockQuantity > 0 &&
        p.stockQuantity <= (p.lowStockThreshold ?? lowStockThresholdDefault)
    )
    .slice(0, 10);

  const recentOrders = [...db.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    products: {
      total: db.products.length,
      active: activeProducts.length,
      outOfStock: db.products.filter((p) => p.stockQuantity <= 0).length,
      lowStock: lowStockProducts.length,
    },
    orders: {
      total: db.orders.length,
      byStatus,
      revenue,
    },
    customers: {
      total: new Set(
        db.orders.filter((o) => o.status !== "cancelled").map((o) => o.customer.phone)
      ).size,
    },
    recentOrders,
    lowStockProducts,
    categories: {
      total: db.categories.length,
    },
  };
}

export function computeAnalytics(days = 14): AnalyticsData {
  const db = getDb();

  // Orders per day for the last N days (including empty days)
  const points: OrdersByDayPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    points.push({ date: isoDayKey(d), orderCount: 0, revenue: 0 });
  }
  const byKey = new Map(points.map((p) => [p.date, p]));

  for (const order of db.orders) {
    const key = isoDayKey(order.createdAt);
    const point = byKey.get(key);
    if (point) {
      point.orderCount += 1;
      if (order.status !== "cancelled") point.revenue += order.total;
    }
  }

  // Category inventory breakdown
  const topCategories: CategoryProductCount[] = db.categories
    .map((category) => {
      const products = db.products.filter((p) => p.categoryId === category.id);
      return {
        categoryId: category.id,
        categoryName: category.name,
        productCount: products.length,
        inStockCount: products.filter((p) => p.stockQuantity > 0).length,
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  const liveOrders = db.orders.filter((o) => o.status !== "cancelled");
  const averageOrderValue =
    liveOrders.length === 0
      ? 0
      : Math.round(liveOrders.reduce((s, o) => s + o.total, 0) / liveOrders.length);

  const delivered = db.orders.filter((o) => o.status === "delivered").length;
  const cancelled = db.orders.filter((o) => o.status === "cancelled").length;

  // Best sellers from order lines
  const productMap = new Map<string, { name: string; unitsSold: number; revenue: number }>();
  for (const order of liveOrders) {
    for (const item of order.items) {
      const entry = productMap.get(item.productId) ?? {
        name: item.productName,
        unitsSold: 0,
        revenue: 0,
      };
      entry.unitsSold += item.quantity;
      entry.revenue += item.lineTotal;
      productMap.set(item.productId, entry);
    }
  }
  const topSellingProducts = [...productMap.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  return {
    ordersByDay: points,
    topCategories,
    averageOrderValue,
    fulfilmentRate:
      db.orders.length === 0 ? 0 : Math.round((delivered / db.orders.length) * 100),
    cancellationRate:
      db.orders.length === 0 ? 0 : Math.round((cancelled / db.orders.length) * 100),
    topSellingProducts,
  };
}
