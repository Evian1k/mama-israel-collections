"use client";

import { Check, CheckCircle2, Copy, Info, Package, Phone, SearchX, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { CartItemThumb } from "@/components/cart/cart-item-thumb";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { useOrder } from "@/hooks/use-orders";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { ApiError } from "@/services/api/client";
import { storeConfig } from "@/config/store";
import { formatPrice } from "@/lib/format";
import {
  mpesaPaymentConfirmationMessage,
  orderFollowUpMessage,
} from "@/lib/whatsapp";
import {
  ORDER_STATUS_DESCRIPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/order-utils";
import { variantLabel } from "@/features/checkout/summary";
import { cn } from "@/lib/utils";

/**
 * Order confirmation. The cart was already cleared when the order was placed —
 * this view is read-only and never touches cart state.
 */
export function OrderConfirmationView({ orderNumber }: { orderNumber: string }) {
  const { data: order, isPending, isError, error, refetch } = useOrder(orderNumber);
  const { data: settings } = useStoreSettings();

  if (isPending) {
    return <ConfirmationSkeleton />;
  }

  if (isError) {
    const status = error instanceof ApiError ? error.status : undefined;

    if (status === 404) {
      return (
        <div className="container-page py-16 sm:py-24">
          <EmptyState
            icon={SearchX}
            title="We could not find that order"
            description="Please check the order number on your confirmation and try again. If you have just placed the order, give us a moment and refresh."
            action={
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button asChild className="rounded-full">
                  <Link href="/shop">Continue shopping</Link>
                </Button>
                <WhatsAppButton
                  variant="outline"
                  className="rounded-full"
                  message={orderFollowUpMessage({
                    orderNumber,
                    storeName: settings?.name ?? storeConfig.name,
                  })}
                  label="Ask us on WhatsApp"
                />
              </div>
            }
          />
        </div>
      );
    }

    return (
      <div className="container-page py-16 sm:py-24">
        <ErrorState
          title="We could not load your order"
          message={
            error instanceof Error && error.message
              ? error.message
              : "Something went wrong while fetching this order."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // After the isPending / isError guards TanStack guarantees `order` is defined.

  const storeName = settings?.name ?? storeConfig.name;

  async function copyOrderNumber() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(order!.orderNumber);
      toast.success("Order number copied");
    } catch {
      toast.error("Could not copy — please note the order number down.");
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        {/* ------------------------------- header ------------------------------- */}
        <header className="text-center">
          <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40">
            <Check className="size-8" aria-hidden="true" />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Asante sana! Your order is in.
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            We will call or message you shortly to confirm delivery.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-2 pl-4 pr-2">
              <span className="font-mono text-sm font-medium tracking-wide text-foreground">
                {order.orderNumber}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-primary"
                aria-label={`Copy order number ${order.orderNumber}`}
                onClick={copyOrderNumber}
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </Button>
            </span>
            <OrderStatusBadge status={order.status} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
            {ORDER_STATUS_DESCRIPTIONS[order.status]}
          </p>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>
              Payment:{" "}
              <span className="font-medium text-foreground">
                {PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </span>
            </span>
            <span
              className={cn(
                "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
                PAYMENT_STATUS_STYLES[order.paymentStatus]
              )}
            >
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </p>

          {/* Payment status detail — honest, method-specific copy */}
          {order.paymentMethod === "mpesa" && order.paymentStatus === "pending" ? (
            <div
              role="status"
              className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-left"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Info className="size-4 shrink-0" aria-hidden="true" />
                Awaiting payment verification
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
                We are confirming your M-Pesa payment of {formatPrice(order.total)} (code{" "}
                <span className="font-mono font-semibold tracking-wider text-foreground">
                  {order.mpesaTransactionCode ?? "—"}
                </span>
                ). No action is needed — we will message you as soon as it is verified. You can
                also send us the confirmation on WhatsApp below.
              </p>
            </div>
          ) : order.paymentMethod === "mpesa" && order.paymentStatus === "paid" ? (
            <p
              className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-green-700"
              role="status"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Payment confirmed — thank you!
            </p>
          ) : order.paymentMethod === "pay_on_delivery" && order.paymentStatus === "unpaid" ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Payment will be collected on delivery.
            </p>
          ) : order.paymentStatus === "failed" ? (
            <p className="mt-3 text-sm text-destructive" role="status">
              Payment could not be verified — please contact us on WhatsApp.
            </p>
          ) : order.paymentStatus === "cancelled" ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Payment cancelled.
            </p>
          ) : null}
        </header>

        {/* ---------------------------- what happens next ---------------------------- */}
        <section aria-labelledby="next-steps-heading" className="mt-10">
          <h2
            id="next-steps-heading"
            className="text-center font-display text-lg font-semibold text-foreground"
          >
            What happens next
          </h2>
          <ol className="mt-6 flex flex-col gap-6 sm:flex-row sm:gap-4">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-4 sm:flex-1 sm:flex-col sm:items-center sm:text-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                  <span className="sr-only">Step {index + 1}</span>
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* -------------------------------- items -------------------------------- */}
        <section aria-labelledby="items-heading" className="mt-10">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle id="items-heading" className="font-display text-lg font-semibold">
                Your items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <CartItemThumb
                              item={{ name: line.productName, imageUrl: line.imageUrl }}
                              className="h-14 w-14"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {line.productName}
                              </p>
                              {variantLabel(line.size, line.color) ? (
                                <p className="text-xs text-muted-foreground">
                                  {variantLabel(line.size, line.color)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(line.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* --------------------------- details + totals --------------------------- */}
        <section aria-labelledby="delivery-details-heading" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle id="delivery-details-heading" className="font-display text-lg font-semibold">
                Delivery details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <DetailRow label="Name" value={order.customer.fullName} />
                <DetailRow label="Phone" value={order.customer.phone} />
                {order.customer.email ? (
                  <DetailRow label="Email" value={order.customer.email} />
                ) : null}
                <DetailRow label="Deliver to" value={order.customer.deliveryLocation} />
                <DetailRow
                  label="Payment"
                  value={PAYMENT_METHOD_LABELS[order.paymentMethod]}
                />
                {order.customer.notes ? (
                  <DetailRow label="Notes" value={order.customer.notes} />
                ) : null}
              </dl>

              <Separator className="my-5" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(order.deliveryFee)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-1">
                  <span className="font-display text-lg font-semibold text-foreground">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ------------------------------- actions ------------------------------- */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {order.paymentMethod === "mpesa" && order.mpesaTransactionCode ? (
            <WhatsAppButton
              size="lg"
              className="rounded-full"
              label="Send Payment Confirmation on WhatsApp"
              message={mpesaPaymentConfirmationMessage({
                orderNumber: order.orderNumber,
                amount: order.total,
                customerName: order.customer.fullName,
                transactionCode: order.mpesaTransactionCode,
                storeName,
              })}
            />
          ) : (
            <WhatsAppButton
              variant="outline"
              size="lg"
              className="rounded-full"
              label="Ask about this order on WhatsApp"
              message={orderFollowUpMessage({ orderNumber: order.orderNumber, storeName })}
            />
          )}
          <Button asChild size="lg" className="rounded-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- helpers -------------------------------- */

const NEXT_STEPS = [
  {
    icon: Phone,
    title: "We confirm your order",
    copy: "We call or message you to confirm the details.",
  },
  {
    icon: Package,
    title: "We pack with care",
    copy: "Your pieces are checked and packed carefully.",
  },
  {
    icon: Truck,
    title: "We deliver to you",
    copy: "We deliver to you — or you collect from us.",
  },
] as const;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="container-page py-10 sm:py-14" aria-hidden="true">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-9 w-48 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
