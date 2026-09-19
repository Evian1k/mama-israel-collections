"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useAdminCustomer, useAdminCustomers } from "@/hooks/admin/use-admin-data";
import { useDevDataControls } from "@/hooks/admin/use-admin-stats";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { CustomerDetail, CustomerSummary } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Dev-only helper (mirrors the orders page): opt-in sample catalogue         */
/* -------------------------------------------------------------------------- */

function CustomersSeedHint() {
  const { seedSample } = useDevDataControls();

  const handleSeed = () => {
    seedSample.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sample catalogue loaded", {
          description:
            "Place a test order from the storefront preview — customers are built automatically from orders.",
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
        Want to see how this page works?
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Load the sample catalogue, then place a test order in the storefront preview —
        customers appear here automatically. Sample data can be wiped any time from
        Settings.
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

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

function LocationsCell({ locations }: { locations: string[] }) {
  if (locations.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const rest = locations.length - 1;
  return (
    <span className="text-sm">
      {locations[0]}
      {rest > 0 ? <span className="text-muted-foreground"> +{rest}</span> : null}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Customer detail sheet                                                     */
/* -------------------------------------------------------------------------- */

function CustomerSheetBody({
  id,
  fallback,
  onClose,
}: {
  id: string;
  fallback?: CustomerSummary;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useAdminCustomer(id);

  const title = data?.fullName ?? fallback?.fullName ?? "Customer details";
  const description = data?.phone ?? fallback?.phone ?? "";

  return (
    <>
      <SheetHeader className="space-y-1 border-b border-border p-5 text-left">
        <SheetTitle className="font-display text-lg font-bold">{title}</SheetTitle>
        <SheetDescription>
          {description || "Customer profile built from their orders"}
        </SheetDescription>
      </SheetHeader>

      {isLoading ? (
        <div className="space-y-5 p-5" role="status" aria-live="polite">
          <span className="sr-only">Loading customer…</span>
          <div aria-hidden="true" className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : isError ? (
        <div className="p-5">
          <ErrorState
            compact
            title="Customer could not be loaded"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        </div>
      ) : data ? (
        <div className="flex-1 space-y-6 p-5">
          {/* Contact */}
          <section aria-label="Contact information" className="space-y-2.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-gold" aria-hidden="true" />
              <a
                href={`tel:${data.phone.replace(/[^\d+]/g, "")}`}
                className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {data.phone}
              </a>
            </p>
            <p className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-gold" aria-hidden="true" />
              {data.email ? (
                <a
                  href={`mailto:${data.email}`}
                  className="break-all text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {data.email}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
              <div className="flex flex-wrap gap-1.5">
                {data.deliveryLocations.length > 0 ? (
                  data.deliveryLocations.map((location) => (
                    <Badge key={location} variant="secondary" className="font-normal">
                      {location}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </section>

          {/* Stats */}
          <section aria-label="Customer totals" className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                {formatNumber(data.ordersCount)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                {formatPrice(data.totalSpent)}
              </p>
            </div>
          </section>

          {/* Orders */}
          <section aria-label="Customer orders">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Orders ({formatNumber(data.orders.length)})
            </p>
            {data.orders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No active orders on record for this customer.
              </p>
            ) : (
              <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1 scroll-elegant">
                {data.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.orderNumber}`}
                      onClick={onClose}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-medium tabular-nums">
                          {formatPrice(order.total)}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main view                                                                 */
/* -------------------------------------------------------------------------- */

export function AdminCustomersView() {
  const { data, isLoading, isError, error, refetch } = useAdminCustomers();
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  const customers = data ?? [];
  const total = customers.length;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People who have ordered from you, built automatically from orders."
        actions={
          isLoading ? undefined : (
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {formatNumber(total)} {total === 1 ? "customer" : "customers"}
            </span>
          )
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : isError ? (
        <ErrorState
          title="Customers could not be loaded"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear here automatically after the first order."
          action={<CustomersSeedHint />}
          className="border-solid"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="min-w-44">Customer</TableHead>
                  <TableHead className="min-w-44">Email</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead className="min-w-32">Last order</TableHead>
                  <TableHead className="min-w-40">Delivery locations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    onClick={() => setSelected(customer)}
                    className="cursor-pointer hover:bg-secondary/30"
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(customer);
                        }}
                        className="rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View details for ${customer.fullName}`}
                      >
                        {customer.fullName}
                      </button>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </TableCell>
                    <TableCell className="max-w-52 truncate">
                      {customer.email ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(customer.ordersCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <LocationsCell locations={customer.deliveryLocations} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => setSelected(customer)}
                  aria-label={`View details for ${customer.fullName}`}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{customer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatPrice(customer.totalSpent)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span>
                      {formatNumber(customer.ordersCount)}{" "}
                      {customer.ordersCount === 1 ? "order" : "orders"}
                    </span>
                    <span>
                      Last order:{" "}
                      {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Select a customer to see their contact details and order history.
          </p>
        </>
      )}

      {/* Detail sheet */}
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          {selected ? (
            <CustomerSheetBody
              id={selected.id}
              fallback={selected}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
