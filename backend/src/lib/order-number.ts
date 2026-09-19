import type { DbTx } from "./mappers";
import { ApiError } from "./errors";

/**
 * Order numbers — human friendly: MIC-20260911-0001
 * (MIC + Nairobi calendar day + daily 4-digit sequence).
 *
 * Generated inside the order-creation transaction from a COUNT of the day's
 * orders. Unique-violation retries are handled by the caller, making concurrent
 * checkouts safe.
 */

const NAIROBI_OFFSET_MINUTES = 3 * 60; // Africa/Nairobi = UTC+3, no DST

/** Calendar day (YYYYMMDD) in Nairobi time */
export function nairobiDayKey(date = new Date()): string {
  const shifted = new Date(date.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Calendar day (YYYY-MM-DD) in Nairobi time — used by analytics grouping */
export function nairobiIsoDay(date = new Date()): string {
  const shifted = new Date(date.getTime() + NAIROBI_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export async function generateOrderNumber(tx: DbTx, attempt = 0): Promise<string> {
  const day = nairobiDayKey();
  const prefix = `MIC-${day}-`;
  const count = await tx.order.count({
    where: { orderNumber: { startsWith: prefix } },
  });
  const sequence = count + 1 + attempt;
  if (sequence > 9999) {
    throw ApiError.conflict("Too many orders for today — please contact support.", "ORDER_SEQUENCE_EXHAUSTED");
  }
  return `${prefix}${String(sequence).padStart(4, "0")}`;
}
