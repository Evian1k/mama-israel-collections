import { listCategories } from "@/server/dev-store/categories";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/categories — active categories with product counts */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    return ok(listCategories(includeInactive));
  } catch (error) {
    return toErrorResponse(error);
  }
}
