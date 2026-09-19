import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { getSettings } from "../store/store.service";
import type { Order, OrderStatus } from "../../shared/api-types";

/**
 * ============================================================================
 * TRANSACTIONAL EMAIL — Resend HTTP API (fire-and-forget, never throws)
 * ============================================================================
 * SECURITY/RELIABILITY RULES:
 *  - Email is a side effect: callers use `void sendX(...)` and any failure is
 *    swallowed + logged to the EmailLog table. An email problem can never
 *    break (or roll back) an order.
 *  - Every attempt (sent / failed / skipped) writes an EmailLog row. When
 *    RESEND_API_KEY is empty the attempt is recorded as "skipped".
 *  - Templates are inline-styled HTML (email clients strip <style> tags).
 * ============================================================================
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BRAND_PRIMARY = "#7A2235"; // deep burgundy header bar
const BRAND_TEXT = "#3E2C23"; // espresso body text
const BRAND_MUTED = "#8A7A70";

interface RenderOptions {
  storeName: string;
  heading: string;
  intro: string;
  /** Optional extra line under the totals (status note, payment info, ...). */
  footerNote?: string;
  /** Admin variant: show the full customer contact block. */
  includeCustomerDetails?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

function paymentLabel(method: Order["paymentMethod"]): string {
  switch (method) {
    case "mpesa":
      return "M-Pesa";
    case "card":
      return "Card";
    default:
      return "Pay on delivery";
  }
}

/** Small branded email shell — inline styles only. */
function renderOrderEmail(order: Order, opts: RenderOptions): string {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #EEE6DC;color:${BRAND_TEXT};font-size:14px;">
          ${escapeHtml(item.productName)}${item.size ? ` &middot; Size ${escapeHtml(item.size)}` : ""}${
        item.color ? ` &middot; ${escapeHtml(item.color)}` : ""
      } &times; ${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #EEE6DC;text-align:right;color:${BRAND_TEXT};font-size:14px;white-space:nowrap;">
          ${money(item.lineTotal)}
        </td>
      </tr>`
    )
    .join("");

  const customerBlock = opts.includeCustomerDetails
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#FAF6F0;border-radius:8px;">
      <tr><td style="padding:14px 16px;color:${BRAND_TEXT};font-size:14px;line-height:1.7;">
        <strong>${escapeHtml(order.customer.fullName)}</strong><br />
        Phone: ${escapeHtml(order.customer.phone)}${
      order.customer.email ? `<br />Email: ${escapeHtml(order.customer.email)}` : ""
    }<br />
        Deliver to: ${escapeHtml(order.customer.deliveryLocation)}${
      order.customer.notes ? `<br />Notes: ${escapeHtml(order.customer.notes)}` : ""
    }<br />
        Payment method: ${paymentLabel(order.paymentMethod)}
      </td></tr>
    </table>`
    : "";

  return `
  <div style="margin:0;padding:24px;background:#FAF6F0;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #EEE6DC;">
      <div style="background:${BRAND_PRIMARY};padding:20px 28px;">
        <div style="color:#FFFFFF;font-size:20px;letter-spacing:0.5px;">${escapeHtml(opts.storeName)}</div>
        <div style="color:#E8D9C5;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Order ${escapeHtml(order.orderNumber)}</div>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 8px;color:${BRAND_TEXT};font-size:22px;">${escapeHtml(opts.heading)}</h1>
        <p style="margin:0 0 20px;color:${BRAND_MUTED};font-size:14px;line-height:1.6;">${escapeHtml(opts.intro)}</p>
        ${customerBlock}
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          <tr>
            <td style="padding:4px 0;color:${BRAND_MUTED};font-size:14px;">Subtotal</td>
            <td style="padding:4px 0;text-align:right;color:${BRAND_TEXT};font-size:14px;">${money(order.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:${BRAND_MUTED};font-size:14px;">Delivery</td>
            <td style="padding:4px 0;text-align:right;color:${BRAND_TEXT};font-size:14px;">${money(order.deliveryFee)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:${BRAND_TEXT};font-size:16px;font-weight:bold;border-top:2px solid ${BRAND_PRIMARY};">Total</td>
            <td style="padding:10px 0;text-align:right;color:${BRAND_PRIMARY};font-size:16px;font-weight:bold;border-top:2px solid ${BRAND_PRIMARY};">${money(order.total)}</td>
          </tr>
        </table>
        ${
          opts.footerNote
            ? `<p style="margin:20px 0 0;color:${BRAND_TEXT};font-size:13px;line-height:1.6;">${escapeHtml(opts.footerNote)}</p>`
            : ""
        }
      </div>
      <div style="padding:16px 28px;background:#FAF6F0;border-top:1px solid #EEE6DC;">
        <p style="margin:0;color:${BRAND_MUTED};font-size:12px;line-height:1.6;">
          ${escapeHtml(opts.storeName)} — this is an automated message about order ${escapeHtml(order.orderNumber)}.
        </p>
      </div>
    </div>
  </div>`;
}

/** Per-status customer copy for status-change emails. */
const STATUS_EMAILS: Partial<
  Record<OrderStatus, { subject: string; heading: string; intro: string }>
> = {
  confirmed: {
    subject: "Order confirmed",
    heading: "Your order is confirmed",
    intro: "Good news — we have confirmed your order and started getting it ready.",
  },
  processing: {
    subject: "We are preparing your order",
    heading: "We are preparing your order",
    intro: "Your order is being prepared and will be on its way soon.",
  },
  ready: {
    subject: "Your order is ready",
    heading: "Your order is ready",
    intro: "Your order is packed and ready for delivery.",
  },
  shipped: {
    subject: "On the way",
    heading: "Your order is on the way",
    intro: "Your order has left with our delivery team and is heading to you.",
  },
  delivered: {
    subject: "Delivered — thank you",
    heading: "Delivered — thank you",
    intro: "Your order has been delivered. Thank you for shopping with us!",
  },
  cancelled: {
    subject: "Order cancelled",
    heading: "Your order was cancelled",
    intro: "Your order has been cancelled. If this was unexpected, please contact us.",
  },
};

type EmailStatus = "sent" | "failed" | "skipped";

/**
 * Send one email via Resend and ALWAYS record the outcome in EmailLog.
 * Never throws — the caller's order flow must not be affected.
 */
async function deliver(input: {
  to: string;
  subject: string;
  html: string;
  template: string;
  orderId: string | null;
}): Promise<void> {
  let status: EmailStatus = env.email.resendApiKey ? "sent" : "skipped";
  let error: string | null = null;

  try {
    if (env.email.resendApiKey) {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.email.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.email.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        status = "failed";
        error = `Resend responded ${response.status}`.slice(0, 300);
      }
    }
  } catch (cause) {
    status = "failed";
    error = (cause instanceof Error ? cause.message : "Unknown email error").slice(0, 300);
  }

  try {
    await prisma.emailLog.create({
      data: {
        toEmail: input.to.slice(0, 160),
        subject: input.subject.slice(0, 200),
        template: input.template.slice(0, 40),
        status,
        ...(error ? { error } : {}),
        ...(input.orderId ? { orderId: input.orderId.slice(0, 40) } : {}),
      },
    });
  } catch {
    // Even the audit log must never break the order flow.
  }
}

/**
 * Order placed: customer receipt (when an email was given) + admin notification
 * (EMAIL_ADMIN_INBOX, falling back to the store settings email).
 */
export async function sendOrderPlacedEmails(order: Order): Promise<void> {
  try {
    const settings = await getSettings();

    if (order.customer.email) {
      await deliver({
        to: order.customer.email,
        subject: `Order received — ${order.orderNumber} · ${settings.name}`,
        html: renderOrderEmail(order, {
          storeName: settings.name,
          heading: "Thank you for your order!",
          intro:
            `Hi ${order.customer.fullName}, we have received your order ` +
            "and we will call you shortly to confirm the details.",
          footerNote: `Payment method: ${paymentLabel(order.paymentMethod)}.`,
        }),
        template: "order_placed_customer",
        orderId: order.id,
      });
    }

    const adminInbox = env.email.adminInbox || settings.email;
    if (adminInbox) {
      await deliver({
        to: adminInbox,
        subject: `New order ${order.orderNumber} — ${settings.name}`,
        html: renderOrderEmail(order, {
          storeName: settings.name,
          heading: "New order received",
          intro: `Order ${order.orderNumber} (${money(order.total)}) was just placed in your store.`,
          includeCustomerDetails: true,
        }),
        template: "order_placed_admin",
        orderId: order.id,
      });
    }
  } catch {
    // Never throw — emails must not break the order flow.
  }
}

/** Status update: one customer email per (non-pending) status, when addressable. */
export async function sendOrderStatusEmail(order: Order, note?: string): Promise<void> {
  try {
    if (order.status === "pending") return; // initial state — receipt already sent
    const copy = STATUS_EMAILS[order.status];
    if (!copy) return;
    if (!order.customer.email) return;

    const settings = await getSettings();
    await deliver({
      to: order.customer.email,
      subject: `${copy.subject} — ${order.orderNumber} · ${settings.name}`,
      html: renderOrderEmail(order, {
        storeName: settings.name,
        heading: copy.heading,
        intro: copy.intro,
        footerNote: note,
      }),
      template: `order_${order.status}`,
      orderId: order.id,
    });
  } catch {
    // Never throw — emails must not break the order flow.
  }
}

/**
 * Manual M-Pesa flow: the store owner verified the customer's transaction
 * code — confirm the payment was received. Fired only on the transition TO
 * paid (audited admin endpoint) and never throws.
 */
export async function sendPaymentVerifiedEmail(
  order: Order,
  code: string | null
): Promise<void> {
  try {
    if (!order.customer.email) return;
    const settings = await getSettings();

    await deliver({
      to: order.customer.email,
      subject: `Payment received — ${order.orderNumber} · ${settings.name}`,
      html: renderOrderEmail(order, {
        storeName: settings.name,
        heading: "Payment confirmed",
        intro:
          `Hi ${order.customer.fullName}, thank you! We have verified your M-Pesa ` +
          "payment and your order is now confirmed. We will be in touch shortly " +
          "with delivery details.",
        footerNote: code
          ? `Verified M-Pesa transaction code: ${code}`
          : "Your M-Pesa payment has been verified.",
      }),
      template: "payment_verified",
      orderId: order.id,
    });
  } catch {
    // Never throw — emails must not break the order flow.
  }
}
