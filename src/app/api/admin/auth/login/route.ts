import { adminLogin } from "@/server/admin-auth";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { loginSchema, parseOrThrow } from "@/server/validation";

/**
 * POST /api/admin/auth/login — dev adapter login (Phase 1).
 * Validates against ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 * Phase 2: real JWT sessions on the backend; the response shape stays the same.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { email, password } = parseOrThrow(loginSchema, body);
    const session = adminLogin(email, password);
    return ok(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
