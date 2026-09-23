"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Clock, Loader2, Smartphone, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { paymentsApi } from "@/services/api/payments";

/**
 * Inline M-Pesa payment state, shown in place of the checkout form after the
 * order has been accepted. Keeps the order summary (rendered by the parent)
 * visible while the customer confirms the STK push on their phone.
 *
 * Lifecycle: pushing (order / prompt being sent) → polling (3s interval, max
 * ~2.5 minutes) → success (parent navigates to the confirmation page) or
 * failed / cancelled / timeout (inline recovery actions).
 */

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 50; // 50 × 3s ≈ 2.5 minutes

export interface MpesaFlowState {
  phase: "pushing" | "polling" | "failed" | "cancelled" | "timeout";
  /** Order number once the order exists; null while the first push starts */
  orderNumber: string | null;
  paymentId: string | null;
  /** Instruction / error copy shown to the customer */
  message: string;
  /** Phone the STK prompt was sent to (display only) */
  phone: string;
}

export type MpesaOutcome = "success" | "failed" | "cancelled" | "timeout";

interface MpesaPaymentPanelProps {
  flow: MpesaFlowState;
  /** Terminal result of the polling loop (success/failed/cancelled/timeout) */
  onResolved: (outcome: MpesaOutcome, info: { receipt: string | null }) => void;
  /** Re-send the STK push for the same order */
  onTryAgain: () => void;
  /** Give up on paying now — continue to the confirmation page */
  onContinue: () => void;
}

export function MpesaPaymentPanel({
  flow,
  onResolved,
  onTryAgain,
  onContinue,
}: MpesaPaymentPanelProps) {
  // Keep the latest callback without restarting the polling effect when the
  // parent re-renders (the attempt budget must not reset mid-payment).
  const resolvedRef = useRef(onResolved);
  useEffect(() => {
    resolvedRef.current = onResolved;
  }, [onResolved]);

  const { phase, paymentId } = flow;

  useEffect(() => {
    if (phase !== "polling" || !paymentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = (n: number) => {
      if (cancelled) return;
      paymentsApi
        .paymentStatus(paymentId)
        .then((info) => {
          if (cancelled) return;
          if (info.status === "pending") {
            if (n >= MAX_POLL_ATTEMPTS) {
              resolvedRef.current("timeout", { receipt: null });
              return;
            }
            timer = setTimeout(() => attempt(n + 1), POLL_INTERVAL_MS);
            return;
          }
          if (info.status === "success") {
            resolvedRef.current("success", { receipt: info.receipt });
          } else if (info.status === "failed") {
            resolvedRef.current("failed", { receipt: null });
          } else {
            resolvedRef.current("cancelled", { receipt: null });
          }
        })
        .catch(() => {
          if (cancelled) return;
          // Transient network/server hiccup — keep polling within the budget.
          if (n >= MAX_POLL_ATTEMPTS) {
            resolvedRef.current("timeout", { receipt: null });
            return;
          }
          timer = setTimeout(() => attempt(n + 1), POLL_INTERVAL_MS);
        });
    };

    attempt(1);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, paymentId]);

  if (phase === "pushing") {
    return (
      <PaymentShell ariaLabel="Placing your order">
        <Spinner />
        <h2 className="font-display text-xl font-semibold text-foreground">
          {flow.orderNumber ? "Sending the payment prompt…" : "Placing your order…"}
        </h2>
        <p className="text-sm text-muted-foreground">
          One moment — we are setting up your M-Pesa payment.
        </p>
      </PaymentShell>
    );
  }

  if (phase === "polling") {
    return (
      <PaymentShell ariaLabel="Waiting for M-Pesa payment">
        <Spinner />
        <h2 className="font-display text-xl font-semibold text-foreground">Check your phone</h2>
        <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
          {flow.message}
        </p>
        {flow.phone ? (
          <p className="flex items-center justify-center gap-1.5 text-sm text-foreground">
            <Smartphone className="size-4 shrink-0 text-gold" aria-hidden="true" />
            We prompted {flow.phone}
          </p>
        ) : null}
        {flow.orderNumber ? (
          <p className="text-xs text-muted-foreground">Order {flow.orderNumber}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Enter your M-Pesa PIN when the prompt arrives. We are watching for your
          confirmation — this updates every few seconds.
        </p>
        <p className="text-xs text-muted-foreground">
          Changed your mind? You can dismiss the prompt on your phone — your order stays
          safe either way.
        </p>
      </PaymentShell>
    );
  }

  if (phase === "timeout") {
    return (
      <PaymentShell ariaLabel="Payment confirmation timed out">
        <IconBadge className="bg-amber-100 text-amber-900 ring-amber-200">
          <Clock className="size-7" aria-hidden="true" />
        </IconBadge>
        <h2 className="font-display text-xl font-semibold text-foreground">
          We didn&rsquo;t receive a confirmation in time
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
          If you entered your PIN, don&rsquo;t worry — we will verify and confirm your
          order. You can also continue and we&rsquo;ll sort it out on call.
        </p>
        {flow.orderNumber ? (
          <p className="text-xs text-muted-foreground">Order {flow.orderNumber}</p>
        ) : null}
        <Button onClick={onContinue} size="lg" className="rounded-full">
          Continue
        </Button>
      </PaymentShell>
    );
  }

  // failed | cancelled — the payment did not complete
  const cancelled = phase === "cancelled";
  return (
    <PaymentShell ariaLabel={cancelled ? "Payment cancelled" : "Payment failed"}>
      <IconBadge className="bg-destructive/10 text-destructive ring-destructive/30">
        {cancelled ? (
          <XCircle className="size-7" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-7" aria-hidden="true" />
        )}
      </IconBadge>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {cancelled ? "You cancelled the payment" : "The payment didn\u2019t go through"}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
        {flow.message}
      </p>
      <p className="text-xs text-muted-foreground">
        Your order is safe — nothing was charged. You can try the prompt again, or
        continue now and pay when your order arrives.
      </p>
      <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={onTryAgain} size="lg" className="w-full rounded-full sm:w-auto">
          Try again
        </Button>
        <Button
          onClick={onContinue}
          size="lg"
          variant="outline"
          className="w-full rounded-full sm:w-auto"
        >
          Continue without paying
        </Button>
      </div>
    </PaymentShell>
  );
}

/* ------------------------------ small pieces ------------------------------ */

function PaymentShell({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center sm:p-12"
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="flex size-12 items-center justify-center rounded-full bg-secondary/60 text-primary"
      aria-hidden="true"
    >
      <Loader2 className="size-6 animate-spin" />
    </span>
  );
}

function IconBadge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex size-14 items-center justify-center rounded-full ring-1 ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
