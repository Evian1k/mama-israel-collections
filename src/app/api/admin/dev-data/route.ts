import { requireAdmin } from "@/server/admin-auth";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { clearSampleData, resetDevData, seedSampleData } from "@/server/dev-store/seed";
import { devDataSchema, parseOrThrow } from "@/server/validation";
import { isBackendMode } from "@/lib/runtime-mode";

/**
 * POST /api/admin/dev-data — DEVELOPMENT-ONLY store controls.
 * Never auto-invoked; exposed in Admin → Settings → Development data.
 * DISABLED entirely when the production backend is in charge (BACKEND_API_URL):
 * production data lives in PostgreSQL and sample data must never leak into it.
 */
export async function POST(request: Request) {
  if (isBackendMode()) {
    return Response.json(
      {
        success: false,
        error: {
          code: "DEV_TOOLS_DISABLED",
          message:
            "Development data tools are disabled while the production backend is connected.",
        },
      },
      { status: 410 }
    );
  }
  try {
    requireAdmin(request);
    const body = await readJsonBody(request);
    const { action } = parseOrThrow(devDataSchema, body);

    switch (action) {
      case "seed-sample": {
        const counts = seedSampleData();
        return ok({
          message: "Sample catalogue loaded — clearly labelled, wipe it any time.",
          counts,
        });
      }
      case "clear-sample": {
        clearSampleData();
        return ok({ message: "All sample data removed." });
      }
      case "reset": {
        resetDevData();
        return ok({ message: "Store reset to a clean, empty state." });
      }
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
