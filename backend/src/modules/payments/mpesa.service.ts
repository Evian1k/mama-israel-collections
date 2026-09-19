import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../lib/errors";
import { normaliseKePhone } from "../../lib/phone";
import { confirmOrderPaidBySystem, findOrderByIdOrNumber } from "../orders/orders.service";
import { sendOrderStatusEmail } from "../email/email.service";
import type { DbTx } from "../../lib/mappers";

/**
 * ============================================================================
 * M-PESA DARAJA INTEGRATION (STK Push / Lipa na M-Pesa Online)
 * ============================================================================
 * SECURITY RULES (non-negotiable):
 *  - An order is ONLY marked paid by a verified Daraja callback processed on
 *    the backend (or an explicit admin override). The browser is never trusted.
 *  - Callbacks are idempotent: keyed by CheckoutRequestID (unique index) and
 *    processed exactly once (processedAt guard inside a transaction).
 *  - Callback amounts are validated against the order total before confirming.
 *  - Credentials live in environment variables only — never client-side.
 * ============================================================================
 */

const BASE_URLS: Record<string, string> = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

interface CachedToken {
  token: string;
  expiresAt: number;
}

const globalForMpesa = globalThis as unknown as { __mpesaToken?: CachedToken };

function baseUrl(): string {
  return BASE_URLS[env.mpesa.environment] ?? BASE_URLS.sandbox;
}

export function isConfigured(): boolean {
  return env.mpesa.configured;
}

/** "live" hits Daraja; "simulator" (dev-only) fabricates checkout requests. */
export function mpesaMode(): "live" | "simulator" {
  return env.mpesa.mode === "simulator" ? "simulator" : "live";
}

async function getAccessToken(): Promise<string> {
  const cached = globalForMpesa.__mpesaToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const auth = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(15_000) }
    );
  } catch {
    throw new ApiError("Could not reach the M-Pesa gateway.", 502, "PAYMENT_GATEWAY_ERROR");
  }

  if (!response.ok) {
    throw new ApiError("M-Pesa authentication failed.", 502, "PAYMENT_GATEWAY_ERROR");
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: string };
  if (!data.access_token) {
    throw new ApiError("M-Pesa authentication returned no token.", 502, "PAYMENT_GATEWAY_ERROR");
  }

  const expiresInSeconds = Number.parseInt(data.expires_in ?? "3599", 10) || 3599;
  globalForMpesa.__mpesaToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
  return data.access_token;
}

function timestamp(): string {
  const nairobi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return nairobi.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

function password(ts: string): string {
  return Buffer.from(`${env.mpesa.shortcode}${env.mpesa.passkey}${ts}`).toString("base64");
}

export interface StkPushResult {
  paymentId: string;
  checkoutRequestId: string;
  merchantRequestId: string | null;
  status: "pending";
  orderNumber: string;
  message: string;
}

export async function initiateStkPush(
  orderNumber: string,
  rawPhone: string
): Promise<StkPushResult> {
  // The credentials guard applies to live mode only — the simulator is
  // deliberately usable without any Daraja configuration (dev/tests).
  if (mpesaMode() === "live" && !isConfigured()) {
    throw new ApiError(
      "M-Pesa payments are not configured yet. Please complete your order with pay on delivery or contact us on WhatsApp.",
      503,
      "PAYMENTS_NOT_CONFIGURED"
    );
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
  });
  if (!order) {
    throw ApiError.notFound("We could not find that order.", "ORDER_NOT_FOUND");
  }
  if (order.paymentStatus === "paid") {
    throw ApiError.conflict("This order has already been paid.", "CONFLICT");
  }

  const phone = normaliseKePhone(rawPhone);
  if (!phone) {
    throw ApiError.validation("Enter a valid Kenyan phone number, e.g. 0712 345 678");
  }

  const amount = Math.round(Number(order.total));
  if (amount < 1) {
    throw ApiError.conflict("The order total is not payable via M-Pesa.", "CONFLICT");
  }

  let payload: {
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorMessage?: string;
  };

  if (mpesaMode() === "simulator") {
    // ------------------------------------------------------------------
    // DEV-ONLY SIMULATOR: fabricate a Daraja-shaped success payload with
    // NO outbound call and NO real charge. The callback endpoint remains
    // the ONLY path to "paid" — feed it this CheckoutRequestID manually.
    // ------------------------------------------------------------------
    payload = {
      ResponseCode: "0",
      CheckoutRequestID: `SIM-${crypto.randomUUID()}`,
      MerchantRequestID: `SIMM-${crypto.randomUUID().slice(0, 12)}`,
    };
    console.warn(
      `[MPESA SIMULATOR] STK push simulated for order ${order.orderNumber} — no real charge. ` +
        `Pay via POST /api/payments/mpesa/callback with this CheckoutRequestID: ${payload.CheckoutRequestID}`
    );
  } else {
    const token = await getAccessToken();
    const ts = timestamp();

    try {
      const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: env.mpesa.shortcode,
          Password: password(ts),
          Timestamp: ts,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone.replace("+", ""),
          PartyB: env.mpesa.shortcode,
          PhoneNumber: phone.replace("+", ""),
          CallBackURL: env.mpesa.callbackUrl,
          AccountReference:
            order.orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "MICORDER",
          TransactionDesc: `Order ${order.orderNumber}`.slice(0, 13),
        }),
        signal: AbortSignal.timeout(20_000),
      });

      payload = (await response.json()) as typeof payload;
    } catch {
      throw new ApiError(
        "The M-Pesa request timed out. Please try again shortly.",
        502,
        "PAYMENT_GATEWAY_ERROR"
      );
    }
  }

  if (payload.ResponseCode !== "0" || !payload.CheckoutRequestID) {
    throw new ApiError(
      payload.errorMessage ?? payload.ResponseDescription ?? "M-Pesa could not start the payment.",
      502,
      "PAYMENT_REQUEST_FAILED"
    );
  }

  // Record the pending payment + transaction (idempotent on CheckoutRequestID)
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "mpesa",
        status: "pending",
        amount: amount,
        phone,
      },
    });
    await tx.paymentTransaction.create({
      data: {
        paymentId: created.id,
        checkoutRequestId: payload.CheckoutRequestID!,
        merchantRequestId: payload.MerchantRequestID ?? null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" },
    });
    return created;
  });

  return {
    paymentId: payment.id,
    checkoutRequestId: payload.CheckoutRequestID,
    merchantRequestId: payload.MerchantRequestID ?? null,
    status: "pending",
    orderNumber: order.orderNumber,
    message: "Enter your M-Pesa PIN on the prompt we just sent to your phone.",
  };
}

// ------------------------------ Callback -----------------------------------

interface StkCallbackMetadataItem {
  Name: string;
  Value?: string | number;
}

interface StkCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: StkCallbackMetadataItem[] };
    };
  };
}

export interface CallbackOutcome {
  handled: boolean;
  duplicate: boolean;
  status: "success" | "failed" | "cancelled" | "unknown";
}

/**
 * Process a Daraja callback. Idempotent: a transaction whose CheckoutRequestID
 * was already processed is acknowledged but NOT re-applied.
 */
export async function processStkCallback(body: StkCallbackBody): Promise<CallbackOutcome> {
  const callback = body.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;

  if (!checkoutRequestId) {
    return { handled: false, duplicate: false, status: "unknown" };
  }

  const metaItems = callback?.CallbackMetadata?.Item ?? [];
  const metaValue = (name: string): string | number | undefined =>
    metaItems.find((i) => i.Name === name)?.Value;
  const receipt = metaValue("MpesaReceiptNumber");
  const amount = metaValue("Amount");

  // Captured for the post-commit email trigger (fire-and-forget, never blocks).
  const paidTrigger: { orderId: string | null; receipt: string | null } = {
    orderId: null,
    receipt: null,
  };

  const outcome = await prisma.$transaction(
    async (tx: DbTx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { checkoutRequestId },
        include: { payment: true },
      });

      if (!transaction) {
        // Unknown callback — acknowledge so Daraja stops retrying; log for audit.
        return { handled: false, duplicate: false, status: "unknown" } as CallbackOutcome;
      }

      if (transaction.processedAt !== null) {
        return { handled: true, duplicate: true, status: mapStatus(transaction.resultCode) } as CallbackOutcome;
      }

      const resultCode = typeof callback?.ResultCode === "number" ? callback.ResultCode : null;
      const payment = transaction.payment;

      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          resultCode,
          resultDesc: callback?.ResultDesc?.slice(0, 255) ?? null,
          receipt: typeof receipt === "string" ? receipt : null,
          processedAt: new Date(),
          raw: callback as unknown as Prisma.InputJsonValue,
        },
      });

      if (resultCode === 0) {
        // Amount validation — never trust unverified success
        const paidAmount = typeof amount === "number" ? amount : Number(amount ?? NaN);
        if (!Number.isFinite(paidAmount) || Math.round(paidAmount) !== Math.round(Number(payment.amount))) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "failed" },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: "unpaid" },
          });
          await tx.orderStatusEvent.create({
            data: {
              orderId: payment.orderId,
              previousStatus: null,
              newStatus: "pending",
              changedBy: null,
              note: "M-Pesa callback amount mismatch — payment NOT confirmed.",
            },
          });
          return { handled: true, duplicate: false, status: "failed" } as CallbackOutcome;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "success" },
        });
        await confirmOrderPaidBySystem(
          tx,
          payment.orderId,
          `Payment received via M-Pesa${typeof receipt === "string" ? ` (receipt ${receipt})` : ""} — auto-confirmed.`
        );
        paidTrigger.orderId = payment.orderId;
        paidTrigger.receipt = typeof receipt === "string" ? receipt : null;
        return { handled: true, duplicate: false, status: "success" } as CallbackOutcome;
      }

      // Failure / user cancellation
      const status = resultCode === 1032 ? "cancelled" : "failed";
      await tx.payment.update({
        where: { id: payment.id },
        data: { status },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: "unpaid" },
      });
      return { handled: true, duplicate: false, status } as CallbackOutcome;
    },
    { isolationLevel: "ReadCommitted" }
  );

  // The order was auto-confirmed inside the committed transaction — email the
  // customer ("Order confirmed") without ever blocking this response.
  if (outcome.status === "success" && paidTrigger.orderId) {
    const paidOrderId = paidTrigger.orderId;
    const paidReceipt = paidTrigger.receipt;
    void findOrderByIdOrNumber(paidOrderId)
      .then((order) =>
        sendOrderStatusEmail(
          order,
          `Payment received via M-Pesa${paidReceipt ? ` (receipt ${paidReceipt})` : ""}.`
        )
      )
      .catch(() => undefined);
  }

  return outcome;
}

function mapStatus(resultCode: number | null): "success" | "failed" | "cancelled" | "unknown" {
  if (resultCode === null) return "unknown";
  if (resultCode === 0) return "success";
  if (resultCode === 1032) return "cancelled";
  return "failed";
}

// ------------------------------ Status lookup ------------------------------

export async function getPaymentStatus(id: string): Promise<{
  id: string;
  status: string;
  amount: number;
  orderNumber: string | null;
  receipt: string | null;
  checkoutRequestId: string | null;
  updatedAt: string;
} | null> {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { order: true, transactions: true },
  });
  if (!payment) return null;

  const transaction = payment.transactions
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    id: payment.id,
    status: payment.status,
    amount: Number(payment.amount),
    orderNumber: payment.order.orderNumber,
    receipt: transaction?.receipt ?? null,
    checkoutRequestId: transaction?.checkoutRequestId ?? null,
    updatedAt: payment.updatedAt.toISOString(),
  };
}
