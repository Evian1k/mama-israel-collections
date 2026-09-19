import { requireAdmin } from "@/server/admin-auth";
import { getDb } from "@/server/dev-store/db";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, settingsPatchSchema } from "@/server/validation";

/** GET /api/admin/settings — full store settings (documented extension) */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(getDb().settings);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/admin/settings — update store settings */
export async function PATCH(request: Request) {
  try {
    requireAdmin(request);
    const body = await readJsonBody(request);
    const input = parseOrThrow(settingsPatchSchema, body);
    const db = getDb();
    const s = db.settings;

    if (input.name !== undefined) s.name = input.name;
    if (input.shortName !== undefined) s.shortName = input.shortName;
    if (input.tagline !== undefined) s.tagline = input.tagline;
    if (input.description !== undefined) s.description = input.description;
    if (input.email !== undefined) s.email = input.email;
    if (input.phone !== undefined) s.phone = input.phone;
    if (input.whatsappNumber !== undefined) {
      s.whatsappNumber = input.whatsappNumber.replace(/[\s-]/g, "");
    }
    if (input.location !== undefined) s.location = input.location;
    if (input.socialLinks) {
      s.socialLinks = { ...s.socialLinks, ...input.socialLinks };
    }
    if (input.delivery) {
      s.delivery = { ...s.delivery, ...input.delivery };
    }
    if (input.payments) {
      s.payments = input.payments;
    }
    if (input.lowStockThreshold !== undefined) s.lowStockThreshold = input.lowStockThreshold;
    s.updatedAt = new Date().toISOString();

    return ok(s);
  } catch (error) {
    return toErrorResponse(error);
  }
}
