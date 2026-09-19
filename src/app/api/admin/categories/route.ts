import { requireAdmin } from "@/server/admin-auth";
import { createCategory, listAllCategoriesAdmin } from "@/server/dev-store/categories";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { categoryInputSchema, parseOrThrow } from "@/server/validation";

/** GET /api/admin/categories — all categories (including inactive) */
export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok(listAllCategoriesAdmin());
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/admin/categories — create a category */
export async function POST(request: Request) {
  try {
    requireAdmin(request);
    const body = await readJsonBody(request);
    const input = parseOrThrow(categoryInputSchema, body);
    const category = createCategory(input);
    return ok(category, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
