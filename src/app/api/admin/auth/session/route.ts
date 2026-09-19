import { ApiError } from "@/services/api/client";
import { adminSessionInfo } from "@/server/admin-auth";
import { ok, toErrorResponse } from "@/server/http";

/** GET /api/admin/auth/session — validate the stored token on app boot */
export async function GET(request: Request) {
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const session = adminSessionInfo(token);
    if (!session) {
      throw new ApiError("Session expired. Please sign in again.", 401, "UNAUTHORIZED");
    }
    return ok(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
