"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminOrder, useAdminOrderMutations } from "@/hooks/admin/use-admin-data";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatDateTime, formatPrice } from "@/lib/format";
import { variantLabel } from "@/features/checkout/summary";
import {
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_DOTS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-utils";
import { buildWhatsAppUrl, isWhatsAppConfigured, orderFollowUpMessage } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { ORDER_STATUSES } from "@/types/order";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                          */
/* -------------------------------------------------------------------------- */

function OrderDetailSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading order…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full rounded-full" />
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  WhatsApp action (renders only when the store number is configured)         */
/* -------------------------------------------------------------------------- */

function OrderWhatsAppAction({ order }: { order: Order }) {
  const { data: settings, isLoading } = useStoreSettings();

  if (isLoading) return null;
  if (!isWhatsAppConfigured(settings?.whatsappNumber)) return null;

  const url = buildWhatsAppUrl(
    settings?.whatsappNumber,
    orderFollowUpMessage({
      orderNumber: order.orderNumber,
      storeName: settings?.name ?? "Mama Israel Collections",
    })
  );
  if (!url) return null;

  return (
    <Button asChild variant="outline" className="gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Message the customer on WhatsApp (opens WhatsApp)"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        Message customer
      </a>
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status management card                                                    */
/* -------------------------------------------------------------------------- */

function StatusManager({ order }: { order: Order }) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const { updateStatus } = useAdminOrderMutations();
  const pending = updateStatus.isPending;
  const unchanged = selectedStatus === order.status;

  const handleUpdate = async () => {
    if (unchanged) return;
    try {
      const updated = await updateStatus.mutateAsync({
        id: order.id,
        status: selectedStatus,
        note: note.trim() || undefined,
      });
      toast.success(`Status updated to ${ORDER_STATUS_LABELS[updated.status]}`);
      setNote("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the status. Please try again."
      );
    }
  };

  const history = [...order.statusHistory].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status management</CardTitle>
        <CardDescription>
          Move this order through fulfilment — customers see the latest status on their
          order page.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {/* Current status visual */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
            <span
              aria-hidden="true"
              className={cn("size-3 shrink-0 rounded-full", ORDER_STATUS_DOTS[order.status])}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {ORDER_STATUS_LABELS[order.status]}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {ORDER_STATUS_DESCRIPTIONS[order.status]}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status-select">New status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
              disabled={pending}
            >
              <SelectTrigger id="order-status-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status-note">Note (optional)</Label>
            <Input
              id="order-status-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Handed to courier at 2pm"
              maxLength={300}
              disabled={pending}
              aria-describedby="order-status-note-hint"
            />
            <p id="order-status-note-hint" className="text-xs text-muted-foreground">
              Added to this order&apos;s history — visible to you, not the customer.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={pending || unchanged}
            className="w-full gap-2 rounded-full sm:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {pending ? "Updating…" : "Update status"}
          </Button>
        </div>

        {/* Status history timeline (newest first) */}
        <div>
          <p className="mb-4 text-sm font-medium text-foreground">Status history</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          ) : (
            <ol className="space-y-0">
              {history.map((event, index) => (
                <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < history.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[5px] top-4 h-full w-px bg-border"
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-background",
                      ORDER_STATUS_DOTS[event.status],
                      index === 0 && "ring-gold-soft"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {ORDER_STATUS_LABELS[event.status]}
                      </p>
                      {index === 0 ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                    {event.note ? (
                      <p className="mt-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs italic text-muted-foreground">
                        “{event.note}”
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Payment card                                                              */
/* -------------------------------------------------------------------------- */

interface PaymentAction {
  status: PaymentStatus;
  label: string;
  tone: "primary" | "neutral" | "danger" | "quiet";
  title: string;
  description: string;
}

/**
 * Purposeful verification actions, driven by the current payment status.
 * Every action opens a confirm dialog that spells out exactly what will be
 * recorded — verification is a deliberate, audited act.
 */
function paymentActions(order: Order): PaymentAction[] {
  const amount = formatPrice(order.total);
  const code = order.mpesaTransactionCode ?? "(no code submitted)";

  if (order.paymentMethod === "mpesa") {
    switch (order.paymentStatus) {
      case "pending":
        return [
          {
            status: "paid",
            label: "Verify payment — mark as Paid",
            tone: "primary",
            title: "Verify this payment as Paid?",
            description: `You confirm that M-Pesa transaction code ${code} matches a completed payment of ${amount} for order ${order.orderNumber}. This will be recorded as Paid and the customer will see it as confirmed.`,
          },
          {
            status: "failed",
            label: "Mark as Failed",
            tone: "danger",
            title: "Mark this payment as Failed?",
            description: `Records that the payment for order ${order.orderNumber} could not be verified. The customer is asked to contact you on WhatsApp. Check your M-Pesa records carefully first.`,
          },
          {
            status: "cancelled",
            label: "Mark as Cancelled",
            tone: "quiet",
            title: "Mark this payment as Cancelled?",
            description: `Records that the payment for order ${order.orderNumber} was cancelled. Use this only if the customer says they never completed the payment.`,
          },
        ];
      case "paid":
        return [
          {
            status: "pending",
            label: "Revert to Awaiting verification",
            tone: "quiet",
            title: "Revert to Awaiting verification?",
            description: `Sets the payment for order ${order.orderNumber} back to "Awaiting verification" — use this if the earlier verification was a mistake.`,
          },
          {
            status: "refunded",
            label: "Mark as Refunded",
            tone: "neutral",
            title: "Mark this payment as Refunded?",
            description: `Records that ${amount} was returned to the customer for order ${order.orderNumber}. Make sure the refund was actually sent via M-Pesa first.`,
          },
        ];
      case "failed":
        return [
          {
            status: "paid",
            label: "Mark as Paid",
            tone: "primary",
            title: "Mark this payment as Paid?",
            description: `You confirm that M-Pesa transaction code ${code} matches a completed payment of ${amount} for order ${order.orderNumber}. The customer will see the payment as verified.`,
          },
          {
            status: "pending",
            label: "Revert to Awaiting verification",
            tone: "quiet",
            title: "Revert to Awaiting verification?",
            description: `Sets the payment for order ${order.orderNumber} back to "Awaiting verification" — use this if marking it failed was a mistake.`,
          },
        ];
      case "cancelled":
        return [
          {
            status: "pending",
            label: "Revert to Awaiting verification",
            tone: "quiet",
            title: "Revert to Awaiting verification?",
            description: `Sets the payment for order ${order.orderNumber} back to "Awaiting verification" so it can be verified again.`,
          },
        ];
      case "refunded":
        return [
          {
            status: "paid",
            label: "Mark as Paid",
            tone: "quiet",
            title: "Mark this payment as Paid again?",
            description: `Sets the payment for order ${order.orderNumber} back to Paid — use this if recording the refund was a mistake.`,
          },
        ];
      default:
        // "unpaid" M-Pesa orders (legacy) can still be verified normally.
        return [
          {
            status: "paid",
            label: "Verify payment — mark as Paid",
            tone: "primary",
            title: "Verify this payment as Paid?",
            description: `You confirm that M-Pesa transaction code ${code} matches a completed payment of ${amount} for order ${order.orderNumber}.`,
          },
          {
            status: "failed",
            label: "Mark as Failed",
            tone: "danger",
            title: "Mark this payment as Failed?",
            description: `Records that the payment for order ${order.orderNumber} could not be verified. The customer is asked to contact you on WhatsApp.`,
          },
        ];
    }
  }

  // Pay on delivery — cash collected in person
  if (order.paymentStatus === "unpaid") {
    return [
      {
        status: "paid",
        label: "Mark as Paid — cash collected",
        tone: "primary",
        title: "Record cash collected?",
        description: `Records that ${amount} in cash was collected on delivery for order ${order.orderNumber}. The customer will see the payment as Paid.`,
      },
    ];
  }
  return [
    {
      status: "unpaid",
      label: "Mark as Unpaid",
      tone: "neutral",
      title: "Mark this payment as Unpaid?",
      description: `Sets the payment for order ${order.orderNumber} back to "Unpaid" — use this if recording the cash collection was a mistake.`,
    },
  ];
}

const ACTION_TONE_CLASSES: Record<PaymentAction["tone"], string> = {
  primary: "",
  neutral: "",
  danger:
    "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
  quiet: "text-muted-foreground",
};

function PaymentActionDialog({
  order,
  action,
  disabled,
}: {
  order: Order;
  action: PaymentAction;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { setPaymentStatus } = useAdminOrderMutations();
  const pending = setPaymentStatus.isPending;

  const handleConfirm = async () => {
    try {
      const updated = await setPaymentStatus.mutateAsync({
        id: order.id,
        status: action.status,
        note: note.trim() || undefined,
      });
      toast.success(
        `Payment status updated to ${PAYMENT_STATUS_LABELS[updated.paymentStatus]}`
      );
      setNote("");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the payment status. Please try again."
      );
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setNote("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={action.tone === "primary" ? "default" : action.tone === "danger" ? "outline" : action.tone === "neutral" ? "outline" : "ghost"}
          className={cn("gap-1.5", ACTION_TONE_CLASSES[action.tone])}
          size="sm"
          disabled={disabled}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          {action.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{action.title}</AlertDialogTitle>
          <AlertDialogDescription>{action.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`payment-note-${action.status}`}>Note (optional)</Label>
          <Input
            id={`payment-note-${action.status}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Confirmed against the M-Pesa statement"
            maxLength={300}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Kept with this payment record for your own audit trail.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={() => void handleConfirm()}>
            {pending ? "Recording…" : `Record as ${PAYMENT_STATUS_LABELS[action.status]}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PaymentManager({ order }: { order: Order }) {
  const isMpesa = order.paymentMethod === "mpesa";
  const actions = paymentActions(order);
  const { setPaymentStatus } = useAdminOrderMutations();
  const busy = setPaymentStatus.isPending;

  const copyTransactionCode = async () => {
    const code = order.mpesaTransactionCode ?? "";
    if (!code) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      toast.success("Transaction code copied");
    } catch {
      toast.error("Could not copy — please note the code down.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          {isMpesa
            ? "Verify the customer's M-Pesa payment against your own M-Pesa records."
            : "This order is paid in cash when it arrives."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header row: status + method + amount */}
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className="text-sm font-medium text-foreground">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </span>
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            • {formatPrice(order.total)}
          </span>
        </div>

        {isMpesa ? (
          <div className="rounded-lg border border-border bg-secondary/40 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                M-Pesa transaction code
              </p>
              {order.mpesaTransactionCode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:text-primary"
                  aria-label={`Copy transaction code ${order.mpesaTransactionCode}`}
                  onClick={() => void copyTransactionCode()}
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <p
              className={cn(
                "mt-0.5 font-mono text-xl font-semibold tracking-wider",
                order.mpesaTransactionCode ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {order.mpesaTransactionCode ?? "Not provided"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {formatDateTime(order.createdAt)}
            </p>
          </div>
        ) : null}

        {order.paymentStatus === "paid" ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <span aria-hidden="true" className="size-2 rounded-full bg-green-600" />
            Payment verified.
          </p>
        ) : null}

        {/* Purposeful actions — each one opens a confirm dialog */}
        <div className="flex flex-wrap gap-2" aria-label="Payment actions">
          {actions.map((action) => (
            <PaymentActionDialog
              key={`${action.status}-${action.label}`}
              order={order}
              action={action}
              disabled={busy}
            />
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Verifying means you have confirmed the code against your own M-Pesa records. The
          website never receives money directly.
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Customer card                                                             */
/* -------------------------------------------------------------------------- */

function CustomerCard({ order }: { order: Order }) {
  const { customer } = order;
  const phoneDigits = customer.phone.replace(/[^\d+]/g, "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer.fullName}</CardTitle>
        <CardDescription>Contact and delivery details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-center gap-2.5">
          <Phone className="size-4 shrink-0 text-gold" aria-hidden="true" />
          {phoneDigits.length >= 7 ? (
            <a
              href={`tel:${phoneDigits}`}
              className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {customer.phone}
            </a>
          ) : (
            <span>{customer.phone}</span>
          )}
        </p>
        <p className="flex items-center gap-2.5">
          <Mail className="size-4 shrink-0 text-gold" aria-hidden="true" />
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="break-all text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {customer.email}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
        <p className="flex items-center gap-2.5">
          <MapPin className="size-4 shrink-0 text-gold" aria-hidden="true" />
          <span className="text-foreground">{customer.deliveryLocation}</span>
        </p>
        {customer.notes ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order notes
            </p>
            <blockquote className="border-l-2 border-gold/60 pl-3 text-sm italic leading-relaxed text-muted-foreground">
              {customer.notes}
            </blockquote>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Items card                                                                */
/* -------------------------------------------------------------------------- */

function ItemsCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
        <CardDescription>
          {order.items.length} {order.items.length === 1 ? "piece" : "pieces"} in this order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="min-w-52">Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/60">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-muted-foreground/50"
                          >
                            {item.productName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`/products/${item.productSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          aria-label={`${item.productName} (opens storefront in a new tab)`}
                        >
                          {item.productName}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {variantLabel(item.size, item.color) || "One size"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">×{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPrice(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="tabular-nums">{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-border pt-2.5">
            <span className="font-display text-base font-bold text-foreground">TOTAL</span>
            <span className="font-display text-lg font-bold tabular-nums text-foreground">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Top-level view                                                            */
/* -------------------------------------------------------------------------- */

export function AdminOrderDetail({ id }: { id: string }) {
  const { data: order, isLoading, isError, error, refetch } = useAdminOrder(id);
  const notFound =
    isError && (error as { status?: number } | undefined)?.status === 404;

  if (isLoading) {
    return (
      <div>
        <OrderDetailSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <PageHeader title="Order detail" />
        <EmptyState
          icon={SearchX}
          title="Order not found"
          description="This order may have been removed, or the link is incorrect."
          action={
            <Button asChild className="rounded-full gap-2">
              <Link href="/admin/orders">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to all orders
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div>
        <PageHeader title="Order detail" />
        <ErrorState
          title="Order could not be loaded"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={formatDateTime(order.createdAt)}
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/admin/orders">
                <ArrowLeft className="size-4" aria-hidden="true" />
                All orders
              </Link>
            </Button>
            <OrderWhatsAppAction order={order} />
          </>
        }
      />

      <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <StatusManager key={order.status} order={order} />
          <ItemsCard order={order} />
        </div>
        <div className="space-y-6">
          {/* key: adopt the server truth whenever the payment status changes */}
          <PaymentManager key={order.paymentStatus} order={order} />
          <CustomerCard order={order} />
        </div>
      </div>
    </div>
  );
}
