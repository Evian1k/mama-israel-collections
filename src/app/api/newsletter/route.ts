import { getDb } from "@/server/dev-store/db";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow, newsletterSchema } from "@/server/validation";

/** POST /api/newsletter — save a newsletter subscription (documented extension) */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { email } = parseOrThrow(newsletterSchema, body);
    const db = getDb();

    const already = db.newsletterSubscribers.some((s) => s.email === email);
    if (!already) {
      db.newsletterSubscribers.unshift({ email, createdAt: new Date().toISOString() });
    }

    return ok(
      {
        email,
        message: already
          ? "You are already on the list — thank you!"
          : "Thank you for subscribing!",
      },
      already ? 200 : 201
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
