import { getDb } from "@/server/dev-store/db";
import { generateId } from "@/server/dev-store/ids";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { contactSchema, parseOrThrow } from "@/server/validation";

/** POST /api/contact — store an inbound contact message (documented extension) */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const input = parseOrThrow(contactSchema, body);
    const db = getDb();

    db.contactMessages.unshift({
      id: generateId("msg"),
      ...input,
      createdAt: new Date().toISOString(),
    });

    return ok(
      { message: "Message received! We will get back to you as soon as possible." },
      201
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
