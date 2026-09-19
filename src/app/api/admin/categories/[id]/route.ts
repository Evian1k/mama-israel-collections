import { requireAdmin } from "@/server/admin-auth";
import { deleteCategory, updateCategory } from "@/server/dev-store/categories";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { categoryInputSchema, parseOrThrow } from "@/server/validation";

/** PATCH /api/admin/categories/:id */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseOrThrow(categoryInputSchema.partial(), body);
    const category = updateCategory(decodeURIComponent(id), input);
    return ok(category);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/admin/categories/:id — blocked while products still reference it */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    deleteCategory(decodeURIComponent(id));
    return ok({ id: decodeURIComponent(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
