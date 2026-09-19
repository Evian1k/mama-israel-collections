import { prisma } from "../../lib/prisma";
import { mapOrder, mapProduct } from "../../lib/mappers";
import { nairobiIsoDay } from "../../lib/order-number";
import type {
  AnalyticsData,
  CategoryProductCount,
  DashboardStats,
  OrderStatusCounts,
  OrdersByDayPoint,
} from "../../shared/api-types";
import { ORDER_STATUSES } from "../../shared/api-types";

/**
 * ============================================================================
 * ANALYTICS — computed from real PostgreSQL records. No fake statistics.
 * Empty database → honest zeros and empty datasets.
 * Revenue excludes cancelled orders (same methodology as Phase 1 labels).
 * Day grouping uses Africa/Nairobi (the business timezone).
 * ============================================================================
 */

export async function computeDashboardStats(): Promise<DashboardStats> {
  const [productTotals, orderGroups, revenueAgg, customerCount, recentOrders, categoryCount] =
    await prisma.$transaction([
      prisma.product.aggregate({
        _count: { _all: true },
        where: { isActive: true },
      }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "cancelled" } },
      }),
      prisma.customer.count({
        where: { orders: { some: { status: { not: "cancelled" } } } },
      }),
      prisma.order.findMany({
        include: {
          items: true,
          statusHistory: true,
          payments: { include: { transactions: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.category.count(),
    ]);

  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0])
  ) as unknown as OrderStatusCounts;
  let ordersTotal = 0;
  for (const group of orderGroups) {
    const count = (group._count ?? {}) as { _all: number };
    byStatus[group.status] = count._all;
    ordersTotal += count._all;
  }

  const [productTotal, outOfStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stockQuantity: { lte: 0 } } }),
  ]);

  // Low-stock products (stock > 0 && stock <= per-product threshold)
  const allActive = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, stockQuantity: true, lowStockThreshold: true },
  });
  const lowStockIds = allActive
    .filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold)
    .slice(0, 10)
    .map((p) => p.id);
  const lowStockProducts = lowStockIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: lowStockIds } },
        include: { images: true, category: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return {
    products: {
      total: productTotal,
      active: productTotals._count._all,
      outOfStock,
      lowStock: lowStockIds.length,
    },
    orders: {
      total: ordersTotal,
      byStatus,
      revenue: Number(revenueAgg._sum.total ?? 0),
    },
    customers: {
      total: customerCount,
    },
    recentOrders: recentOrders.map(mapOrder),
    lowStockProducts: lowStockProducts.map(mapProduct),
    categories: {
      total: categoryCount,
    },
  };
}

export async function computeAnalytics(days = 14): Promise<AnalyticsData> {
  const window = Math.min(90, Math.max(1, Number.isFinite(days) ? Math.trunc(days) : 14));

  // Orders per day (Nairobi calendar days), including zero days
  const since = new Date(Date.now() - (window - 1) * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [orders, categoryCounts, aovAgg, statusCounts, topProducts] = await prisma.$transaction([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, total: true },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      orderBy: { categoryId: "asc" },
    }),
    prisma.order.aggregate({
      _avg: { total: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, lineTotal: true },
      where: { order: { status: { not: "cancelled" } } },
      orderBy: { productId: "asc" },
    }),
  ]);

  const points: OrdersByDayPoint[] = [];
  const byKey = new Map<string, OrdersByDayPoint>();
  for (let i = window - 1; i >= 0; i -= 1) {
    const date = nairobiIsoDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    const point = { date, orderCount: 0, revenue: 0 };
    points.push(point);
    byKey.set(date, point);
  }
  for (const order of orders) {
    const key = nairobiIsoDay(order.createdAt);
    const point = byKey.get(key);
    if (point) {
      point.orderCount += 1;
      if (order.status !== "cancelled") point.revenue += Number(order.total);
    }
  }

  // Category inventory breakdown (all products, like the Phase 1 adapter)
  const categories = await prisma.category.findMany({
    include: { products: { select: { stockQuantity: true } } },
  });
  const countsByCategory = new Map(
    categoryCounts.map((c) => [c.categoryId, ((c._count ?? {}) as { _all: number })._all])
  );
  const topCategories: CategoryProductCount[] = categories
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      productCount: countsByCategory.get(category.id) ?? 0,
      inStockCount: category.products.filter((p) => p.stockQuantity > 0).length,
    }))
    .sort((a, b) => b.productCount - a.productCount);

  const countOf = (g: (typeof statusCounts)[number]) => (g._count ?? {}) as { _all: number };
  const totalOrders = statusCounts.reduce((sum, g) => sum + countOf(g)._all, 0);
  const delivered = statusCounts.find((g) => g.status === "delivered")?.status === "delivered"
    ? countOf(statusCounts.find((g) => g.status === "delivered")!)._all
    : 0;
  const cancelled = statusCounts.find((g) => g.status === "cancelled")?.status === "cancelled"
    ? countOf(statusCounts.find((g) => g.status === "cancelled")!)._all
    : 0;

  // Best sellers — resolve names from current catalogue (snapshot fallback)
  const productIds = topProducts.map((t) => t.productId).filter((id): id is string => id !== null);
  const nameRows = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const namesById = new Map(nameRows.map((p) => [p.id, p.name]));
  const orderItemsForNames = productIds.length
    ? await prisma.orderItem.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, productName: true },
        distinct: ["productId"],
      })
    : [];
  for (const item of orderItemsForNames) {
    if (item.productId && !namesById.has(item.productId)) {
      namesById.set(item.productId, item.productName);
    }
  }

  return {
    ordersByDay: points,
    topCategories,
    averageOrderValue: Math.round(Number(aovAgg._avg.total ?? 0)),
    fulfilmentRate: totalOrders === 0 ? 0 : Math.round((delivered / totalOrders) * 100),
    cancellationRate: totalOrders === 0 ? 0 : Math.round((cancelled / totalOrders) * 100),
    topSellingProducts: topProducts
      .map((t) => {
        const sums = (t._sum ?? {}) as { quantity: number | null; lineTotal: string | number | null };
        return {
          productId: t.productId ?? "",
          name: namesById.get(t.productId ?? "") ?? "Unavailable product",
          unitsSold: sums.quantity ?? 0,
          revenue: Number(sums.lineTotal ?? 0),
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5),
  };
}
