/**
 * Kenyan phone normalisation — mirrors the frontend checkout schema.
 * Accepted input: 07XXXXXXXX / 01XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX
 * Normalised output: +2547XXXXXXXX (E.164, used for customers + M-Pesa).
 */

const KE_PHONE_LOCAL = /^(?:\+?254|0)(?:7|1)\d{8}$/;

export function isKePhone(input: string): boolean {
  return KE_PHONE_LOCAL.test(input.replace(/[\s-]/g, ""));
}

/** Returns "+2547XXXXXXXX" or null when the input is not a valid KE number. */
export function normaliseKePhone(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "");
  if (!KE_PHONE_LOCAL.test(cleaned)) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("254")) return `+${cleaned}`;
  return `+254${cleaned.slice(1)}`;
}
