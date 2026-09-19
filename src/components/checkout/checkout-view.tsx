"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Copy, Info, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { CartItemThumb } from "@/components/cart/cart-item-thumb";
import { useCart } from "@/features/cart/use-cart";
import {
  checkoutFormSchema,
  type CheckoutFormInput,
  type CheckoutFormValues,
} from "@/features/checkout/schema";
import {
  deliveryDisplay,
  matchDeliveryZone,
  variantLabel,
  type DeliveryDisplay,
} from "@/features/checkout/summary";
import { usePlaceOrder } from "@/hooks/use-orders";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { paymentsApi, type CheckoutPaymentMethods } from "@/services/api/payments";
import { ApiError } from "@/services/api/client";
import { storeConfig } from "@/config/store";
import { queryKeys } from "@/lib/query-keys";
import { formatPrice } from "@/lib/format";
import type { StoreDeliveryZone } from "@/types";
import { cn } from "@/lib/utils";

/** Server codes that mean the bag itself needs attention before re-submitting */
const REVIEW_BAG_CODES = new Set(["OUT_OF_STOCK", "PRODUCT_NOT_FOUND", "INVALID_VARIANT"]);

/** M-Pesa transaction code: 8–15 letters/digits (from the confirmation SMS) */
const MPESA_CODE_PATTERN = /^[A-Za-z0-9]{8,15}$/;
const MPESA_CODE_ERROR =
  "Enter the transaction code from your M-Pesa SMS (e.g. QGH7JK3N2P).";

interface SubmitIssue {
  message: string;
  reviewBag: boolean;
}

type PaymentMethodChoice = "pay_on_delivery" | "mpesa";

/** What the order summary shows once the order is placed (cart is cleared) */
interface OrderSnapshot {
  items: ReturnType<typeof useCart>["items"];
  count: number;
  subtotal: number;
  /** Server-authoritative money values from the placed order (KSh) */
  deliveryFee?: number;
  total?: number;
}

/** Copy a value to the clipboard with honest feedback (used for Till/Paybill) */
async function copyToClipboard(value: string, successMessage: string) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy — please write it down instead.");
  }
}

/**
 * Checkout: customer details, delivery info and payment method.
 * The payment options are whatever the owner has enabled in
 * Admin → Settings → Payments (served by GET /api/payments/methods).
 * "Pay with M-Pesa" is the manual Lipa na M-Pesa flow: the customer pays via
 * Till/Paybill and submits the transaction code from their confirmation SMS;
 * the store owner verifies it against their own M-Pesa records afterwards —
 * the website never charges anyone. The server remains the sole authority on
 * fees, availability and payment state.
 */
export function CheckoutView() {
  const { items, hydrated, count, subtotal, clearCart } = useCart();
  const { data: settings } = useStoreSettings();
  const router = useRouter();
  const placeOrder = usePlaceOrder();
  const [submitIssue, setSubmitIssue] = useState<SubmitIssue | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>("pay_on_delivery");
  const [transactionCode, setTransactionCode] = useState("");
  const [transactionCodeError, setTransactionCodeError] = useState<string | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<OrderSnapshot | null>(null);

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      deliveryLocation: "",
      notes: "",
    },
  });

  const notesValue = form.watch("notes") ?? "";
  const deliveryLocationValue = form.watch("deliveryLocation") ?? "";

  /* ------------------------------ payment methods ------------------------------ */

  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods(),
    queryFn: ({ signal }) => paymentsApi.methods(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const methodsChecking = methodsQuery.isPending;
  const methods: CheckoutPaymentMethods | undefined = methodsQuery.data;

  const payOnDeliveryAvailable = methodsQuery.isSuccess && Boolean(methods?.payOnDelivery);
  const mpesaAvailable = methodsQuery.isSuccess && Boolean(methods?.mpesa.enabled);
  /** Nothing can be offered (or availability could not be determined) */
  const paymentsUnavailable =
    !methodsChecking && !payOnDeliveryAvailable && !mpesaAvailable;

  /** The selected choice, corrected to the closest available method */
  const selectedMethod: PaymentMethodChoice | null = (() => {
    if (paymentMethod === "pay_on_delivery") {
      if (payOnDeliveryAvailable || methodsChecking) return "pay_on_delivery";
      return mpesaAvailable ? "mpesa" : null;
    }
    if (mpesaAvailable) return "mpesa";
    return payOnDeliveryAvailable ? "pay_on_delivery" : null;
  })();

  const normalizedCode = transactionCode.replace(/\s+/g, "").toUpperCase();
  const transactionCodeValid = MPESA_CODE_PATTERN.test(normalizedCode);

  /* --------------------------------- totals ---------------------------------- */

  const zones: StoreDeliveryZone[] = settings?.delivery?.zones ?? [];
  const delivery = deliveryDisplay(subtotal, settings?.delivery, deliveryLocationValue);
  // Once an order is placed the cart is cleared — display the SERVER totals
  // from the order snapshot instead of recomputing from the empty cart.
  // (Defensive fallbacks keep an in-flight snapshot from older code safe.)
  const total =
    orderSnapshot && typeof orderSnapshot.total === "number"
      ? orderSnapshot.total
      : subtotal + (delivery.fee ?? 0);

  /* -------------------------------- submission -------------------------------- */

  const handleOrderError = (error: unknown) => {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "We could not place your order. Please try again.";
    const code = error instanceof ApiError ? error.code : undefined;
    const reviewBag = typeof code === "string" && REVIEW_BAG_CODES.has(code);
    setSubmitIssue({ message, reviewBag });
    toast.error(message);
  };

  const buildOrderInput = (values: CheckoutFormValues, method: PaymentMethodChoice) => ({
    items: items.map((item) => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
    customer: values,
    paymentMethod: method,
    ...(method === "mpesa" ? { mpesaTransactionCode: normalizedCode } : {}),
  });

  const onSubmit = form.handleSubmit((values: CheckoutFormValues) => {
    if (items.length === 0 || placeOrder.isPending || methodsChecking) return;
    const method = selectedMethod;
    if (!method) return;
    setSubmitIssue(null);

    if (method === "mpesa") {
      if (!transactionCodeValid) {
        setTransactionCodeError(MPESA_CODE_ERROR);
        return;
      }
      setTransactionCodeError(null);

      // Snapshot the bag for the summary card — the cart is cleared the
      // moment the order exists, and the summary must not flash empty.
      setOrderSnapshot({ items, count, subtotal });

      placeOrder.mutate(buildOrderInput(values, "mpesa"), {
        onSuccess: (order) => {
          // Freeze the summary on the SERVER-computed money values.
          setOrderSnapshot((previous) => ({
            items: previous?.items ?? items,
            count: previous?.count ?? count,
            subtotal: previous?.subtotal ?? subtotal,
            deliveryFee: order.deliveryFee,
            total: order.total,
          }));
          clearCart();
          router.replace(`/order-confirmation/${order.orderNumber}`);
        },
        onError: (error) => {
          setOrderSnapshot(null);
          handleOrderError(error);
        },
      });
      return;
    }

    placeOrder.mutate(buildOrderInput(values, "pay_on_delivery"), {
      onSuccess: (order) => {
        // The bag is done its job — clear it before handing over to the
        // confirmation page (which must NOT clear the cart again).
        clearCart();
        router.replace(`/order-confirmation/${order.orderNumber}`);
      },
      onError: handleOrderError,
    });
  });

  if (!hydrated) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16 sm:py-24">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Add pieces you love to your bag first — then we can check you out."
          action={
            <Button asChild size="lg" className="rounded-full">
              <Link href="/shop">Shop the Collection</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const submitting = form.formState.isSubmitting || placeOrder.isPending;
  const summaryItems = orderSnapshot?.items ?? items;
  const summaryCount = orderSnapshot?.count ?? count;
  const summarySubtotal = orderSnapshot?.subtotal ?? subtotal;
  const summaryDelivery = orderSnapshot
    ? {
        ...delivery,
        fee:
          typeof orderSnapshot.deliveryFee === "number" ? orderSnapshot.deliveryFee : delivery.fee,
        confirmed: true,
        label:
          typeof orderSnapshot.deliveryFee === "number"
            ? orderSnapshot.deliveryFee === 0
              ? "Free"
              : `KSh ${orderSnapshot.deliveryFee.toLocaleString("en-KE")}`
            : delivery.label,
      }
    : delivery;

  const submitDisabled = submitting || methodsChecking || !selectedMethod;
  const isMpesa = selectedMethod === "mpesa";

  return (
    <div className="container-page pb-36 pt-8 sm:pt-10 lg:pb-12">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your details below — we confirm every order personally before delivery.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        {/* Order summary — first on mobile so it is always reachable */}
        <aside aria-label="Order summary" className="order-1 lg:order-2 lg:sticky lg:top-20">
          <OrderSummaryCard
            items={summaryItems}
            count={summaryCount}
            subtotal={summarySubtotal}
            delivery={summaryDelivery}
            total={total}
            note={settings?.delivery.note}
          />
        </aside>

        <section aria-label="Checkout details" className="order-2 lg:order-1 lg:col-span-2">
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            {submitIssue ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    {submitIssue.reviewBag ? "Please review your bag" : "We could not place your order"}
                  </p>
                  <p className="text-muted-foreground">{submitIssue.message}</p>
                  {submitIssue.reviewBag ? (
                    <Link
                      href="/cart"
                      className="inline-block text-xs font-medium text-primary underline underline-offset-4"
                    >
                      Review your bag
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <DetailsSection form={form} />

            <DeliverySection
              form={form}
              notesValue={notesValue}
              zones={zones}
              estimate={delivery}
            />

            <PaymentSection
              selected={selectedMethod}
              onSelect={(next) => {
                setPaymentMethod(next);
                setTransactionCodeError(null);
              }}
              checking={methodsChecking}
              payOnDeliveryAvailable={payOnDeliveryAvailable}
              mpesaAvailable={mpesaAvailable}
              mpesa={methods?.mpesa}
              fallbackBusinessName={settings?.name ?? storeConfig.name}
              total={total}
              transactionCode={transactionCode}
              transactionCodeError={transactionCodeError}
              onTransactionCodeChange={(next) => {
                setTransactionCode(next);
                if (transactionCodeError) setTransactionCodeError(null);
              }}
            />

            {/* Desktop submit — inside the form flow */}
            <div className="hidden lg:block">
              <Separator className="mb-6" />
              <Button
                type="submit"
                size="lg"
                disabled={submitDisabled}
                className="w-full rounded-full text-base"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {submitting
                  ? "Placing your order…"
                  : isMpesa
                    ? `Confirm Payment • ${formatPrice(total)}`
                    : `Place Order • ${formatPrice(total)}`}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {isMpesa
                  ? "We verify your M-Pesa payment shortly after you place the order."
                  : "You only pay when your order arrives."}
              </p>
            </div>

            {/* Mobile sticky submit bar — still part of the form, so it submits */}
            <div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
            >
              <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
                <div className="shrink-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Total
                  </p>
                  <p className="font-display text-lg font-semibold text-primary">
                    {formatPrice(total)}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitDisabled}
                  className="ml-auto flex-1 rounded-full sm:flex-none"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {submitting ? "Placing…" : isMpesa ? "Confirm Payment" : "Place Order"}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------- form sections ------------------------------ */

type CheckoutForm = ReturnType<
  typeof useForm<CheckoutFormInput, unknown, CheckoutFormValues>
>;

function DetailsSection({ form }: { form: CheckoutForm }) {
  const { register, formState } = form;
  const errors = formState.errors;

  return (
    <section aria-labelledby="details-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 id="details-heading" className="font-display text-lg font-semibold text-foreground">
        Your details
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p id="fullName-error" className="text-xs text-destructive">
              {errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={cn("phone-hint", errors.phone && "phone-error")}
            {...register("phone")}
          />
          <p id="phone-hint" className="text-xs text-muted-foreground">
            {storeConfig.phoneHint}
          </p>
          {errors.phone ? (
            <p id="phone-error" className="text-xs text-destructive">
              {errors.phone.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email (optional — for order updates)</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DeliverySection({
  form,
  notesValue,
  zones,
  estimate,
}: {
  form: CheckoutForm;
  notesValue: string;
  zones: StoreDeliveryZone[];
  estimate: DeliveryDisplay;
}) {
  const { register, formState } = form;
  const errors = formState.errors;
  const deliveryLocation = form.watch("deliveryLocation") ?? "";
  const selectedZone = matchDeliveryZone(deliveryLocation, zones);
  const hasZones = zones.length > 0;

  return (
    <section aria-labelledby="delivery-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 id="delivery-heading" className="font-display text-lg font-semibold text-foreground">
        Delivery
      </h2>
      <div className="mt-4 grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="deliveryLocation">Delivery location</Label>
          {hasZones ? (
            <RadioGroup
              value={selectedZone?.name ?? ""}
              onValueChange={(value) =>
                form.setValue("deliveryLocation", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              aria-label="Delivery zones"
              className="grid gap-2 sm:grid-cols-2"
            >
              {zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <Label
                    key={zone.id}
                    htmlFor={`delivery-zone-${zone.id}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 font-normal transition-colors",
                      isSelected ? "border-primary/40 bg-secondary/50" : "border-border"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <RadioGroupItem
                        id={`delivery-zone-${zone.id}`}
                        value={zone.name}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="truncate text-sm font-medium text-foreground">{zone.name}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-foreground">
                      {zone.fee === 0 ? "Free" : formatPrice(zone.fee)}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          ) : null}
          <Input
            id="deliveryLocation"
            list="delivery-areas"
            autoComplete="shipping address-level2"
            placeholder="Town or estate, e.g. Kilimani"
            aria-invalid={Boolean(errors.deliveryLocation)}
            aria-describedby={cn("deliveryLocation-hint", errors.deliveryLocation && "deliveryLocation-error")}
            {...register("deliveryLocation")}
          />
          <datalist id="delivery-areas">
            {storeConfig.deliveryAreas.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
          <p id="deliveryLocation-hint" className="text-xs text-muted-foreground">
            {hasZones
              ? "Pick a zone above, or type your exact town or estate — zones match by name."
              : "Start typing to pick a suggestion, or tell us your town or estate."}
          </p>
          {hasZones ? (
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {estimate.fee !== null
                ? `Delivery: ${estimate.label}`
                : "Delivery: to be confirmed with you"}
            </p>
          ) : null}
          {errors.deliveryLocation ? (
            <p id="deliveryLocation-error" className="text-xs text-destructive">
              {errors.deliveryLocation.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="notes">Delivery notes (optional)</Label>
            <span
              id="notes-counter"
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                notesValue.length > 480 && "text-destructive"
              )}
              aria-live="polite"
            >
              {notesValue.length}/500
            </span>
          </div>
          <Textarea
            id="notes"
            rows={3}
            maxLength={500}
            placeholder="Gate details, landmarks, preferred delivery time…"
            aria-describedby={cn("notes-hint", errors.notes && "notes-error")}
            {...register("notes")}
          />
          <p id="notes-hint" className="text-xs text-muted-foreground">
            Anything that helps us find you easily.
          </p>
          {errors.notes ? (
            <p id="notes-error" className="text-xs text-destructive">
              {errors.notes.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- payment ---------------------------------- */

type MpesaConfig = NonNullable<CheckoutPaymentMethods["mpesa"]>;

/** Numbered steps for one M-Pesa channel (used when the owner wrote no custom copy) */
function mpesaSteps(channel: "till" | "paybill"): string[] {
  return [
    "Open M-Pesa on your phone.",
    "Select Lipa na M-Pesa.",
    channel === "till" ? "Select Buy Goods and Services." : "Select Pay Bill.",
    channel === "till" ? "Enter the Till Number above." : "Enter the Business Number above.",
    "Enter the exact amount shown.",
    "Complete the payment with your M-Pesa PIN.",
  ];
}

function StepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function NumberBlock({
  label,
  value,
  caption,
  toastMessage,
}: {
  id: string;
  label: string;
  value: string;
  caption: string;
  toastMessage: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:text-primary"
          aria-label={`Copy ${label.toLowerCase()} ${value}`}
          onClick={() => void copyToClipboard(value, toastMessage)}
        >
          <Copy className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <p
        className="mt-0.5 font-mono text-xl font-semibold tracking-wider text-foreground tabular-nums"
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function MpesaInstructionsCard({
  mpesa,
  fallbackBusinessName,
  total,
}: {
  mpesa: MpesaConfig;
  fallbackBusinessName: string;
  total: number;
}) {
  const businessName = mpesa.businessName || fallbackBusinessName;
  const hasTill = Boolean(mpesa.tillNumber);
  const hasPaybill = Boolean(mpesa.paybillNumber);
  const both = hasTill && hasPaybill;

  return (
    <div
      aria-labelledby="mpesa-instructions-heading"
      className="mt-4 space-y-4 rounded-lg border border-dashed border-gold/50 bg-gold-soft/30 p-4"
    >
      <div>
        <p id="mpesa-instructions-heading" className="font-display text-base font-semibold text-foreground">
          Pay with M-Pesa
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Paying to <span className="font-medium text-foreground">{businessName}</span>
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Amount</span>
        <span className="font-display text-2xl font-semibold text-primary tabular-nums">
          {formatPrice(total)}
        </span>
      </div>

      {hasTill ? (
        <NumberBlock
          id="mpesa-till-number"
          label="Till Number"
          value={mpesa.tillNumber!}
          caption="Lipa na M-Pesa → Buy Goods and Services"
          toastMessage="Till number copied"
        />
      ) : null}

      {hasPaybill ? (
        <>
          <NumberBlock
            id="mpesa-paybill-number"
            label="Paybill Number"
            value={mpesa.paybillNumber!}
            caption="Lipa na M-Pesa → Pay Bill"
            toastMessage="Paybill number copied"
          />
          {mpesa.accountNumber ? (
            <p className="text-sm text-muted-foreground">
              Account Number:{" "}
              <span className="font-mono font-semibold text-foreground">{mpesa.accountNumber}</span>
            </p>
          ) : null}
        </>
      ) : null}

      {mpesa.instructions ? (
        <div className="rounded-lg border border-border bg-background/50 p-3.5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Payment instructions
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {mpesa.instructions}
          </p>
        </div>
      ) : both ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3.5">
            <p className="text-sm font-semibold text-foreground">Option A — Till</p>
            <StepsList steps={mpesaSteps("till")} />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3.5">
            <p className="text-sm font-semibold text-foreground">Option B — Paybill</p>
            <StepsList steps={mpesaSteps("paybill")} />
          </div>
        </div>
      ) : (
        <StepsList steps={mpesaSteps(hasTill ? "till" : "paybill")} />
      )}

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Your payment is verified by our team. Your order will show
        {" '"}Awaiting verification{"'"} until we confirm it — we never charge through this
        website.
      </p>
    </div>
  );
}

function PaymentSection({
  selected,
  onSelect,
  checking,
  payOnDeliveryAvailable,
  mpesaAvailable,
  mpesa,
  fallbackBusinessName,
  total,
  transactionCode,
  transactionCodeError,
  onTransactionCodeChange,
}: {
  selected: PaymentMethodChoice | null;
  onSelect: (value: PaymentMethodChoice) => void;
  checking: boolean;
  payOnDeliveryAvailable: boolean;
  mpesaAvailable: boolean;
  mpesa: MpesaConfig | undefined;
  fallbackBusinessName: string;
  total: number;
  transactionCode: string;
  transactionCodeError: string | null;
  onTransactionCodeChange: (value: string) => void;
}) {
  const showMpesaDetails = selected === "mpesa" && mpesaAvailable;

  return (
    <section aria-labelledby="payment-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 id="payment-heading" className="font-display text-lg font-semibold text-foreground">
        Payment
      </h2>
      <div className="mt-4">
        {checking ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <span className="sr-only">Checking available payment methods…</span>
            <div className="flex items-center gap-3 rounded-lg border border-border p-4 opacity-70">
              <Skeleton className="size-4 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-4 opacity-70">
              <Skeleton className="size-4 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
            </div>
            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              Checking available payment methods…
            </p>
          </div>
        ) : !payOnDeliveryAvailable && !mpesaAvailable ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              Online payment is not available right now. Please contact us on WhatsApp to place
              your order.
            </p>
          </div>
        ) : (
          <RadioGroup
            value={selected ?? ""}
            onValueChange={(next) => onSelect(next as PaymentMethodChoice)}
            aria-label="Payment method"
            className="gap-3"
          >
            {payOnDeliveryAvailable ? (
              <Label
                htmlFor="pay-on-delivery"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors",
                  selected === "pay_on_delivery"
                    ? "border-primary/40 bg-secondary/50"
                    : "border-border"
                )}
              >
                <RadioGroupItem id="pay-on-delivery" value="pay_on_delivery" className="mt-0.5" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">
                    Pay on delivery
                  </span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">
                    Pay cash when your order arrives
                  </span>
                </span>
              </Label>
            ) : null}

            {mpesaAvailable ? (
              <Label
                htmlFor="pay-with-mpesa"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors",
                  selected === "mpesa" ? "border-primary/40 bg-secondary/50" : "border-border"
                )}
              >
                <RadioGroupItem id="pay-with-mpesa" value="mpesa" className="mt-0.5" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">
                    Pay with M-Pesa
                  </span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">
                    Pay now via Lipa na M-Pesa — then enter the transaction code below
                  </span>
                </span>
              </Label>
            ) : null}
          </RadioGroup>
        )}

        {showMpesaDetails && mpesa ? (
          <MpesaInstructionsCard
            mpesa={mpesa}
            fallbackBusinessName={fallbackBusinessName}
            total={total}
          />
        ) : null}

        {showMpesaDetails ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="mpesa-transaction-code">M-Pesa transaction code</Label>
            <Input
              id="mpesa-transaction-code"
              value={transactionCode}
              onChange={(event) =>
                onTransactionCodeChange(event.target.value.toUpperCase().slice(0, 15))
              }
              placeholder="e.g. QGH7JK3N2P"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase tracking-widest"
              aria-invalid={Boolean(transactionCodeError)}
              aria-describedby={cn(
                "mpesa-code-hint",
                transactionCodeError && "mpesa-code-error"
              )}
            />
            <p id="mpesa-code-hint" className="text-xs text-muted-foreground">
              From the M-Pesa confirmation SMS on your phone.
            </p>
            {transactionCodeError ? (
              <p id="mpesa-code-error" role="alert" className="text-xs text-destructive">
                {transactionCodeError}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          Card payments are coming soon.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ summary card ------------------------------ */

function OrderSummaryCard({
  items,
  count,
  subtotal,
  delivery,
  total,
  note,
}: {
  items: ReturnType<typeof useCart>["items"];
  count: number;
  subtotal: number;
  delivery: ReturnType<typeof deliveryDisplay>;
  total: number;
  note?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-lg font-semibold">Your order</CardTitle>
        <CardDescription>
          {count} {count === 1 ? "item" : "items"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3" aria-label="Items in this order">
          {items.map((item) => {
            const variant = variantLabel(item.size, item.color);
            return (
              <li key={item.key} className="flex items-center gap-3">
                <CartItemThumb item={item} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {variant ? `${variant} • ` : ""}
                    {item.quantity} × {formatPrice(item.price)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Delivery</span>
          <span className={delivery.label === "FREE" ? "font-medium text-gold" : "font-medium"}>
            {delivery.label}
          </span>
        </div>
        {note ? (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {note}
          </p>
        ) : null}

        <Separator />

        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-semibold text-foreground">Total</span>
          <span className="font-display text-2xl font-semibold text-primary">
            {formatPrice(total)}
          </span>
        </div>
        {!delivery.confirmed ? (
          <p className="text-xs text-muted-foreground">
            Delivery will be confirmed when we call or message you about your order.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="container-page py-8 sm:py-10" aria-hidden="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:order-1 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-6">
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-96 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
