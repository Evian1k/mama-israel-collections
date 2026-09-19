/**
 * Deterministic formatters (SSR + client hydration safe — no locale engines).
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function groupDigits(value: number): string {
  const [intPart, decPart] = String(Math.abs(value)).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${grouped}.${decPart}` : grouped;
}

/** 2500 -> "KSh 2,500" */
export function formatPrice(amount: number, symbol = "KSh"): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${symbol} ${groupDigits(rounded)}`;
}

/** Plain thousands grouping: 12500 -> "12,500" */
export function formatNumber(value: number): string {
  return groupDigits(value);
}

function parseIso(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2025-06-12T09:30:00Z" -> "12 Jun 2025" */
export function formatDate(value: string | Date): string {
  const d = parseIso(value);
  if (!d) return "—";
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** -> "12 Jun 2025, 09:30" */
export function formatDateTime(value: string | Date): string {
  const d = parseIso(value);
  if (!d) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${mm}`;
}

/** "2025-06-12" (UTC date part) */
export function isoDayKey(value: string | Date): string {
  const d = parseIso(value);
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** " MIC-2506-0042 " -> "MIC-2506-0042" */
export function normalizeOrderNumber(value: string): string {
  return value.trim().toUpperCase();
}
