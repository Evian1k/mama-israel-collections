import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fs from "fs";
import { env } from "../config/env";

/**
 * Multipart (image uploads) + static serving of the local dev upload folder.
 * Cloudinary is the production storage — the /uploads folder is a development
 * fallback only and must never be relied on in production (ephemeral disks).
 */
export async function registerUploads(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
      files: 10, // max 10 images per request
    },
  });

  if (!fs.existsSync(env.uploadsDir)) {
    fs.mkdirSync(env.uploadsDir, { recursive: true });
  }

  await app.register((await import("@fastify/static")).default, {
    root: env.uploadsDir,
    prefix: "/uploads/",
    decorateReply: true,
    maxAge: "7d",
    immutable: true,
  });
}
