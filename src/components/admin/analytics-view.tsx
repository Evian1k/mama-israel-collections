"use client";

import { useState } from "react";
import {
  BarChart3,
  CircleSlash,
  Coins,
  PackageCheck,
  Trophy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RowsSkeleton, StatCardsSkeleton } from "@/components/shared/skeletons";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { SeedSampleButton } from "@/components/admin/dev-data-tools";
import { useAdminRuntime } from "@/features/admin/runtime-context";
import { useAdminAnalytics } from "@/hooks/admin/use-admin-stats";
import { ApiError } from "@/services/api/client";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { AnalyticsData, CategoryProductCount, OrdersByDayPoint } from "@/types";

const DAY_RANGES = [7, 14, 30] as const;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2025-06-12" -> "12 Jun" (deterministic — no locale engines) */
function shortDayLabel(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7)) - 1;
  const day = Number(isoDate.slice(8, 10));
  if (Number.isNaN(month) || Number.isNaN(day) || !MONTHS_SHORT[month]) {
    return "—";
  }
  return `${day} ${MONTHS_SHORT[month]}`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Lightweight CSS bar chart — one flex-1 column per day, bar height scaled to
 * the busiest day (2% floor keeps single-order days visible). Tooltips are the
 * native title attribute; no chart library.
 */
function OrdersBarChart({ points }: { points: OrdersByDayPoint[] }) {
  const max = Math.max(...points.map((p) => p.orderCount), 1);

  return (
    <div>
      <div
        className="flex h-44 items-end gap-1 sm:gap-1.5"
        role="img"
        aria-label={`Bar chart of orders per day over the last ${points.length} days`}
      >
        {points.map((point) => {
          const height =
            point.orderCount > 0
              ? Math.max((point.orderCount / max) * 100, 2)
              : 0;
          return (
            <div
              key={point.date}
              className="flex h-full min-w-0 flex-1 items-end rounded-sm bg-secondary/70"
              title={`${formatDate(point.date)} — ${formatNumber(point.orderCount)} ${pluralize(point.orderCount, "order", "orders")} · ${formatPrice(point.revenue)}`}
            >
              <div
                className="w-full rounded-t-sm bg-primary transition-[height] duration-300"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
        {points.map((point, index) => (
          <span
            key={point.date}
            className="min-w-0 flex-1 truncate text-center text-[10px] leading-none text-muted-foreground"
          >
            {index % 3 === 0 ? shortDayLabel(point.date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopCategoriesCard({ categories }: { categories: CategoryProductCount[] }) {
  const max = Math.max(...categories.map((c) => c.productCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Top categories</CardTitle>
        <CardDescription>
          How your catalogue spreads across collections.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet — they will appear here once you create them.
          </p>
        ) : (
          <ul className="space-y-4">
            {categories.map((category) => {
              return (
                <li key={category.categoryId}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-foreground">
                      {category.categoryName}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatNumber(category.productCount)}{" "}
                      {pluralize(category.productCount, "product", "products")}
                      {" · "}
                      {formatNumber(category.inStockCount)} in stock
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
                    role="img"
                    aria-label={`${category.categoryName}: ${category.productCount} products, ${category.inStockCount} in stock`}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{
                        width: `${(category.productCount / max) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BestSellersCard({ data }: { data: AnalyticsData }) {
  const products = data.topSellingProducts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Best sellers</CardTitle>
        <CardDescription>
          Most-ordered pieces across all non-cancelled orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <EmptyState
            compact
            icon={Trophy}
            title="No best sellers yet"
            description="Once orders come in, your most-loved pieces will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">
                Best selling products ranked by units sold
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Units sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="max-w-56 font-medium">
                      <span className="block truncate">{product.name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(product.unitsSold)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(product.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsView() {
  const [days, setDays] = useState<number>(14);
  const { backendMode } = useAdminRuntime();
  const { data, isPending, isError, error, refetch } = useAdminAnalytics(days);

  const header = (
    <PageHeader
      title="Analytics"
      description="Sales and catalogue trends — computed from real orders only."
      actions={
        <Select
          value={String(days)}
          onValueChange={(value) => setDays(Number(value))}
        >
          <SelectTrigger
            className="w-[150px]"
            aria-label="Analytics date range"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_RANGES.map((range) => (
              <SelectItem key={range} value={String(range)}>
                Last {range} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );

  // 401 means the session expired — the shell guard redirects to login.
  if (isError && error instanceof ApiError && error.isUnauthorized) {
    return null;
  }

  if (isError) {
    return (
      <>
        {header}
        <ErrorState
          onRetry={() => void refetch()}
          message={error instanceof Error ? error.message : undefined}
        />
      </>
    );
  }

  if (isPending || !data) {
    return (
      <>
        {header}
        <StatCardsSkeleton count={3} />
        <RowsSkeleton rows={6} className="mt-6" />
      </>
    );
  }

  const hasOrderActivity =
    data.ordersByDay.some((point) => point.orderCount > 0) ||
    data.topSellingProducts.length > 0;

  // Every product belongs to a category, so a zero product total here means
  // the whole catalogue is empty — only then offer the sample-data shortcut.
  const catalogueEmpty =
    data.topCategories.reduce((sum, category) => sum + category.productCount, 0) === 0;

  if (!hasOrderActivity) {
    return (
      <>
        {header}
        <EmptyState
          icon={BarChart3}
          title="No sales data yet"
          description="Analytics light up as soon as orders start coming in."
          action={catalogueEmpty && !backendMode ? <SeedSampleButton size="default" /> : undefined}
        />
      </>
    );
  }

  // Phase 1 adapter always returns 14 daily points; the honest window is
  // min(selected days, points available). Phase 2 honours the full range.
  const chartWindow = Math.min(days, data.ordersByDay.length);
  const chartPoints = data.ordersByDay.slice(-chartWindow);

  return (
    <>
      {header}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Orders — last {chartWindow} days
            </CardTitle>
            <CardDescription>
              Order volume per day. Hover a bar for that day&apos;s revenue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersBarChart points={chartPoints} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Average order value"
            value={formatPrice(data.averageOrderValue)}
            icon={Coins}
            hint="Excludes cancelled orders"
          />
          <StatCard
            label="Fulfilment rate"
            value={`${data.fulfilmentRate}%`}
            icon={PackageCheck}
            hint="Delivered orders ÷ all orders"
          />
          <StatCard
            label="Cancellation rate"
            value={`${data.cancellationRate}%`}
            icon={CircleSlash}
            hint="Cancelled orders ÷ all orders"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {/* min-w-0: let grid items shrink so inner overflow-x-auto scrolls */}
          <div className="min-w-0">
            <TopCategoriesCard categories={data.topCategories} />
          </div>
          <div className="min-w-0">
            <BestSellersCard data={data} />
          </div>
        </div>
      </div>
    </>
  );
}
