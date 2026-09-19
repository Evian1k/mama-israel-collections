import { adminLogout } from "@/server/admin-auth";
import { ok, toErrorResponse } from "@/server/http";

/** POST /api/admin/auth/logout — invalidate the dev session token */
export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    adminLogout(token);
    return ok({ message: "Signed out." });
  } catch (error) {
    return toErrorResponse(error);
  }
}
