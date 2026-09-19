import { ApiError } from "@/services/api/client";
import { requireAdmin } from "@/server/admin-auth";
import { deleteProduct, findProductBySlugOrId, updateProduct } from "@/server/dev-store/products";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, productInputSchema } from "@/server/validation";

/** GET /api/admin/products/:id — fetch one product (by id or slug) */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const product = findProductBySlugOrId(decodeURIComponent(id));
    if (!product) {
      throw new ApiError("Product not found.", 404, "PRODUCT_NOT_FOUND");
    }
    return ok(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/admin/products/:id — update a product */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseOrThrow(productInputSchema.partial(), body);
    const product = updateProduct(decodeURIComponent(id), input);
    return ok(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/admin/products/:id */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(request);
    const { id } = await params;
    deleteProduct(decodeURIComponent(id));
    return ok({ id: decodeURIComponent(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
