import { getApiBaseUrl } from "../client";

/**
 * Image uploads (dev adapter for Phase 1).
 *
 * Phase 1: files are received by POST /api/admin/uploads and written to
 * `public/uploads/` by the dev server. This is a development convenience ONLY.
 *
 * Phase 2: the same call signature is pointed at real storage (Cloudinary /
 * S3 / Supabase presigned uploads). The component below already provides
 * progress events via XHR, which works with both approaches.
 *
 * NOTE: In Phase 1 the upload lives inside the Next.js server, so images are
 * small files (max ~5MB), never stored in a database.
 */

export interface UploadResult {
  images: Array<{
    url: string;
    filename: string;
    size: number;
  }>;
}

export function uploadImages(
  files: File[],
  authToken: string,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads");
    xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as
          | { success: true; data: UploadResult }
          | { success: false; error: { code: string; message: string } };
        if (xhr.status >= 200 && xhr.status < 300 && payload.success) {
          resolve(payload.data);
        } else {
          const err = payload as { success: false; error: { message: string } };
          reject(new Error(err.error?.message ?? "Upload failed. Please try again."));
        }
      } catch {
        reject(new Error("Upload failed: unexpected server response."));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed: network error."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    opts.signal?.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    xhr.send(form);
  });
}

/** Dev-mode upload endpoint helper (used by tests/tools, mirrors the base URL logic) */
export async function uploadEndpointPath(): Promise<string> {
  const base = await getApiBaseUrl();
  return `${base}/api/admin/uploads`;
}
