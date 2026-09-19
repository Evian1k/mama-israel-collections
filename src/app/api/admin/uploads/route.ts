import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ApiError } from "@/services/api/client";
import { requireAdmin } from "@/server/admin-auth";
import { fail, ok, toErrorResponse } from "@/server/http";

/**
 * POST /api/admin/uploads — DEVELOPMENT image storage (Phase 1 only).
 *
 * Accepts multipart/form-data with one or more `files`, validates type/size,
 * and writes them to `public/uploads/` so they are served by the dev server.
 *
 * Phase 2: replaced by Cloudinary / S3 / Supabase Storage (direct signed
 * uploads from the browser). See docs/BACKEND_IMPLEMENTATION_PLAN.md §10.
 * No product images are ever stored in the database.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  try {
    requireAdmin(request);

    const form = await request.formData().catch(() => null);
    if (!form) {
      throw new ApiError("Expected multipart/form-data upload.", 400, "BAD_REQUEST");
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      throw new ApiError("No files were uploaded.", 400, "BAD_REQUEST");
    }
    if (files.length > 10) {
      throw new ApiError("Upload up to 10 images at a time.", 400, "BAD_REQUEST");
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new ApiError(
          `"${file.name}" is not a supported image (use JPG, PNG, WebP or AVIF).`,
          400,
          "BAD_REQUEST"
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        throw new ApiError(`"${file.name}" is larger than 5MB. Please compress it first.`, 400, "BAD_REQUEST");
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const images: Array<{ url: string; filename: string; size: number }> = [];
    for (const file of files) {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const base = path
        .basename(file.name, path.extname(file.name))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      const filename = `${Date.now()}-${base || "image"}.${ext || "jpg"}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), bytes);
      images.push({ url: `/uploads/${filename}`, filename, size: file.size });
    }

    return ok({ images }, 201);
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error);
    return fail(500, "INTERNAL_ERROR", "Upload failed. Please try again.");
  }
}
