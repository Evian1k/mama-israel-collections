import { getDb } from "@/server/dev-store/db";
import { ok, toErrorResponse } from "@/server/http";

/**
 * GET /api/store — public store settings (name, contact, delivery info...).
 * Values originate from src/config/store.ts and are editable in Admin → Settings.
 *
 * The payments configuration is ADMIN-ONLY: it is never exposed on the
 * public payload (customers use GET /api/payments/methods instead).
 */
export async function GET() {
  try {
    const { payments: _payments, ...publicSettings } = getDb().settings;
    return ok(publicSettings);
  } catch (error) {
    return toErrorResponse(error);
  }
}
