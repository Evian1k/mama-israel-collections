import { ApiError } from "@/services/api/client";
import { findProductBySlugOrId } from "@/server/dev-store/products";
import { ok, toErrorResponse } from "@/server/http";

/**
 * GET /api/products/:slug — product detail by slug (id also accepted).
 * Returns 404 with PRODUCT_NOT_FOUND when missing or inactive.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decoded = decodeURIComponent(slug);
    const product = findProductBySlugOrId(decoded);

    if (!product || !product.isActive) {
      throw new ApiError(
        "This product could not be found — it may have been removed or renamed.",
        404,
        "PRODUCT_NOT_FOUND"
      );
    }

    return ok(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}
