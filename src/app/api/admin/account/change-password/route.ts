import { adminChangeCredentials } from "@/server/admin-auth";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { changeCredentialsSchema, parseOrThrow } from "@/server/validation";

/**
 * POST /api/admin/account/change-password — rotate the admin password
 * (and optionally the admin email). Returns a FRESH session (new token) with
 * mustChangePassword cleared. 401 wrong current password, 400 weak password,
 * 409 email already taken.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const input = parseOrThrow(changeCredentialsSchema, body);
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    // adminChangeCredentials verifies the session (401 when missing/expired)
    // and the current password (401 when wrong).
    const session = adminChangeCredentials(token, {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      email: input.email || undefined,
    });
    return ok(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
