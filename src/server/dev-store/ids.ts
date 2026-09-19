import { getDb } from "./db";

/** Prefixed, sortable-ish unique ids (dev adapter only) */
export function generateId(prefix: "cat" | "prd" | "ord" | "img" | "itm" | "sub" | "msg"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Human-friendly order numbers: MIC-2506-0042 */
export function nextOrderNumber(): string {
  const db = getDb();
  db.seq.order += 1;
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `MIC-${yy}${mm}-${String(db.seq.order).padStart(4, "0")}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Ensures the slug is unique within a collection, appending -2, -3… */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "item";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
