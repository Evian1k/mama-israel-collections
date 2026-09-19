"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Search,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useAdminOrders } from "@/hooks/admin/use-admin-data";
import { useDevDataControls } from "@/hooks/admin/use-admin-stats";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/types/order";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-utils";
import type { Order, OrderStatus, PaymentStatus, Paginated } from "@/types";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TABS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
];

const PAYMENT_FILTERS: Array<{ value: PaymentStatus | "all"; label: string }> = [
  { value: "all", label: "All payment statuses" },
  ...PAYMENT_STATUSES.map((status) => ({
    value: status,
    label: PAYMENT_STATUS_LABELS[status],
  })),
];

/** Contextual copy per status tab — shown when that tab has no orders */
const EMPTY_DESCRIPTIONS: Record<OrderStatus | "all", string> = {
  all: "Orders placed in your store appear here the moment customers check out.",
  pending: "New orders land in this tab the moment customers check out.",
  confirmed: "Confirm a pending order to move it into this tab.",
  processing: "Orders you are currently packing appear here.",
  ready: "Packed orders waiting for delivery or pick-up appear here.",
  shipped: "Orders on the way to their new owner appear here.",
  delivered: "Completed orders are kept here for your records.",
  cancelled: "Cancelled orders are kept here for your records.",
};

function orderHref(order: Order): string {
  return `/admin/orders/${order.orderNumber}`;
}

/** Dev-only helper: when the store is completely empty, offer the opt-in sample fixtures */
function EmptyStoreSeedHint() {
  const { seedSample } = useDevDataControls();

  const handleSeed = () => {
    seedSample.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sample catalogue loaded", {
          description:
            "Place a test order from the storefront preview to see it appear here.",
        });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not load sample data.");
      },
    });
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-dashed border-gold/50 bg-gold-soft/30 p-4 text-left">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <FlaskConical className="size-4 text-gold" aria-hidden="true" />
        Previewing the empty panel?
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Load the clearly-labelled sample catalogue, then place a test order from the
        storefront to preview this page with data. Sample data can be wiped any time
        from Settings.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 gap-2"
        onClick={handleSeed}
        disabled={seedSample.isPending}
      >
        {seedSample.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <FlaskConical className="size-4" aria-hidden="true" />
        )}
        Load sample data
      </Button>
    </div>
  );
}

function OrdersTable({ data }: { data: Paginated<Order> }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/40 hover:bg-secondary/40">
            <TableHead className="min-w-36">Order</TableHead>
            <TableHead className="min-w-44">Customer</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="min-w-40">Date</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">View order</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((order) => (
            <TableRow key={order.id} className="hover:bg-secondary/30">
              <TableCell>
                <Link
                  href={orderHref(order)}
                  className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{order.customer.fullName}</p>
                <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
              </TableCell>
              <TableCell className="text-right tabular-nums">{order.items.length}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPrice(order.total)}</TableCell>
              <TableCell>
                <PaymentStatusBadge status={order.paymentStatus} />
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(order.createdAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={orderHref(order)}
                  aria-label={`View order ${order.orderNumber}`}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrdersCards({ data }: { data: Paginated<Order> }) {
  return (
    <ul className="space-y-3 md:hidden">
      {data.items.map((order) => (
        <li key={order.id}>
          <Link
            href={orderHref(order)}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{order.orderNumber}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">{order.customer.fullName}</p>
              <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="font-medium tabular-nums text-foreground">
                {formatPrice(order.total)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  · {order.items.length} {order.items.length === 1 ? "item" : "items"}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminOrdersView() {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search — commits 300ms after typing stops (setState inside the
  // timeout callback, never synchronously during render/effect)
  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchDraft.trim();
      setSearch((current) => (current === trimmed ? current : trimmed));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  const query = useMemo(
    () => ({ page, status, paymentStatus, search: search || undefined }),
    [page, status, paymentStatus, search]
  );

  const { data, isLoading, isError, isFetching, error, refetch } = useAdminOrders(query);

  const pagination = data?.pagination;
  const isEmpty = Boolean(data && data.items.length === 0);
  // "Store empty" = no orders at all, with every filter in its pristine state
  const isStoreEmpty =
    isEmpty && status === "all" && paymentStatus === "all" && search === "";

  const emptyDescription = search
    ? `No orders match “${search}”. Try a different order number, name or phone.`
    : paymentStatus !== "all"
      ? "No orders with this payment status yet — try a different filter."
      : EMPTY_DESCRIPTIONS[status];

  return (
    <div>
      <PageHeader title="Orders" description="Every order, from pending to delivered." />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as OrderStatus | "all");
            setPage(1);
          }}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary/70 p-1">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg px-3 py-1.5 text-xs sm:text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Label htmlFor="orders-search" className="sr-only">
              Search orders
            </Label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="orders-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search number, name or phone…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-56">
            <Label htmlFor="orders-payment-filter" className="sr-only">
              Filter by payment status
            </Label>
            <Select
              value={paymentStatus}
              onValueChange={(value) => {
                setPaymentStatus(value as PaymentStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger id="orders-payment-filter" aria-label="Filter by payment status">
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ErrorState
          title="Orders could not be loaded"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : data && isEmpty ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders here yet"
          description={emptyDescription}
          action={isStoreEmpty ? <EmptyStoreSeedHint /> : undefined}
          className="border-solid"
        />
      ) : data ? (
        <div className="space-y-4" aria-busy={isFetching}>
          <OrdersTable data={data} />
          <OrdersCards data={data} />

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {isFetching ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              <span>
                Page {formatNumber(pagination?.page ?? page)} of{" "}
                {formatNumber(pagination?.totalPages ?? 1)} ·{" "}
                {formatNumber(pagination?.total ?? 0)}{" "}
                {(pagination?.total ?? 0) === 1 ? "order" : "orders"}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={(pagination?.page ?? page) <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!pagination?.hasMore || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
