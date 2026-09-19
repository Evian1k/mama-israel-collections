"use client";

import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  PackageCheck,
  PackagePlus,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { OrderStatusBadge } from "@/components/admin/status-badge";
import {
  ResetDevDataButton,
  SeedSampleButton,
} from "@/components/admin/dev-data-tools";
import { useAdminRuntime } from "@/features/admin/runtime-context";
import { useAdminDashboard } from "@/hooks/admin/use-admin-stats";
import { ApiError } from "@/services/api/client";
import { formatDate, formatPrice } from "@/lib/format";
import type { DashboardStats } from "@/types";

const GREETING_TITLE = "Karibu, Store Owner";
const GREETING_DESCRIPTION = "A live snapshot of Mama Israel Collections.";

function DashboardHeader() {
  return (
    <PageHeader
      title={GREETING_TITLE}
      description={GREETING_DESCRIPTION}
      actions={
        <Button asChild className="rounded-full">
          <Link href="/admin/products/new">
            <Plus className="size-4" aria-hidden="true" />
            New product
          </Link>
        </Button>
      }
    />
  );
}

/** Shown while GET /api/admin/stats is in flight */
function DashboardLoading() {
  return (
    <>
      <DashboardHeader />
      <StatCardsSkeleton />
      <RowsSkeleton rows={4} className="mt-6" />
    </>
  );
}

const SETUP_STEPS = [
  {
    href: "/admin/products/new",
    icon: PackagePlus,
    title: "Add your first product",
    description: "Photos, price, sizes and stock.",
  },
  {
    href: "/admin/categories",
    icon: Tags,
    title: "Create categories",
    description: "Group your pieces into browsable collections.",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    title: "Set your contact details",
    description: "WhatsApp and location power the storefront.",
  },
] as const;

/**
 * Welcoming onboarding for a brand-new store (no products, no orders).
 * Replaces a wall of zeros with a short checklist + dev preview tools.
 */
function OnboardingWelcome() {
  const { backendMode } = useAdminRuntime();
  return (
    <Card className="border-primary/40 shadow-md shadow-primary/5">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Store className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Your store is ready — let&apos;s fill it!
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Mama Israel Collections is live and empty. Three quick steps and
              you are open for business:
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {SETUP_STEPS.map(({ href, icon: Icon, title, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {description}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* Development tools — clearly labelled, wipeable preview data.
            Hidden entirely when the production backend is connected. */}
        {!backendMode && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Development tools
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Loads clearly-labelled sample data so you can preview the
            storefront. Remove it any time — nothing here is real.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeedSampleButton />
            <ResetDevDataButton />
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardStatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Total products"
        value={stats.products.total}
        icon={Package}
        hint={`${stats.products.active} active`}
      />
      <StatCard
        label="Total orders"
        value={stats.orders.total}
        icon={ShoppingCart}
      />
      <StatCard
        label="Pending orders"
        value={stats.orders.byStatus.pending}
        icon={Clock}
        tone="warning"
      />
      <StatCard
        label="Completed orders"
        value={stats.orders.byStatus.delivered}
        icon={CheckCircle2}
        tone="positive"
      />
      <StatCard
        label="Revenue"
        value={formatPrice(stats.orders.revenue)}
        icon={Banknote}
        hint="Excludes cancelled orders"
      />
    </div>
  );
}

function RecentOrdersCard({ stats }: { stats: DashboardStats }) {
  const orders = stats.recentOrders;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Recent orders</CardTitle>
        <CardDescription>The latest checkouts, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState
            compact
            icon={ShoppingBag}
            title="No orders yet"
            description="Orders appear here the moment customers check out."
          />
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">
                Recent orders, newest first. Select an order number to view it.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const itemCount = order.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  return (
                    <TableRow key={order.id} className="relative">
                      <TableCell>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-sm font-mono text-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                        >
                          {order.orderNumber}
                          <span className="sr-only"> — view order</span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="block max-w-40 truncate">
                          {order.customer.fullName}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {itemCount}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockCard({ stats }: { stats: DashboardStats }) {
  const products = stats.lowStockProducts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Low stock alert</CardTitle>
        <CardDescription>
          Pieces running low — restock before they sell out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <EmptyState compact icon={PackageCheck} title="Stock levels look healthy" />
        ) : (
          <ul className="divide-y divide-border">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="flex items-center justify-between gap-3 rounded-sm py-3 text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {product.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-200 bg-amber-100 text-amber-900"
                  >
                    {product.stockQuantity} left
                  </Badge>
                  <span className="sr-only">— edit product</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const { data, isPending, isError, error, refetch } = useAdminDashboard();

  // 401 means the session expired — the shell guard redirects to login.
  if (isError && error instanceof ApiError && error.isUnauthorized) {
    return null;
  }

  if (isError) {
    return (
      <>
        <DashboardHeader />
        <ErrorState
          onRetry={() => void refetch()}
          message={error instanceof Error ? error.message : undefined}
        />
      </>
    );
  }

  if (isPending || !data) {
    return <DashboardLoading />;
  }

  // A completely untouched store gets the onboarding card instead of zeros.
  const storeIsEmpty = data.products.total === 0 && data.orders.total === 0;

  return (
    <>
      <DashboardHeader />
      {storeIsEmpty ? (
        <OnboardingWelcome />
      ) : (
        <div className="space-y-6">
          <DashboardStatsGrid stats={data} />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {/* min-w-0: grid items must be allowed to shrink below the
                table's min-content width so overflow-x-auto can scroll */}
            <div className="min-w-0">
              <RecentOrdersCard stats={data} />
            </div>
            <div className="min-w-0">
              <LowStockCard stats={data} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
