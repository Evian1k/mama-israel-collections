import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "./errors";

/**
 * JWT access tokens for admin sessions.
 * The frozen frontend contract sends `Authorization: Bearer <token>` and keeps
 * the token in localStorage — so a stateless access token (7 days) is used
 * instead of HTTP-only cookies. Rotating refresh tokens can be layered on top
 * later without changing the login/session response shapes.
 */

export interface AdminTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  if (!env.jwtSecret) {
    throw ApiError.internal("Server is missing JWT_SECRET configuration.");
  }
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: "mama-israel-api",
  } as jwt.SignOptions);
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  if (!env.jwtSecret) {
    throw ApiError.internal("Server is missing JWT_SECRET configuration.");
  }
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: "mama-israel-api" });
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new Error("Malformed token");
    }
    return decoded as unknown as AdminTokenPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("expired")) {
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }
    throw ApiError.unauthorized("Please sign in to the admin panel.");
  }
}
