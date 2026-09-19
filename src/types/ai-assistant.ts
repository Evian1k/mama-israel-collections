/**
 * AI Product Assistant — shared client/server types.
 *
 * The assistant turns the owner's natural-language description into product
 * DRAFTS. Drafts are plain data: nothing is written to the product database
 * until the owner reviews and publishes through the normal admin products API.
 */

export interface AiDraftColor {
  name: string;
  hex: string;
}

/** One product draft produced by the AI parse */
export interface AiProductDraft {
  /** Client-side handle for the draft (server issues a fresh id per parse) */
  draftId: string;
  name: string;
  description: string;
  price: number | null;
  compareAtPrice: number | null;
  /** Set when the AI matched the owner's request to an existing category */
  categoryId: string | null;
  /** Raw category wording from the owner, e.g. "Women's Ankara" */
  requestedCategory: string | null;
  /** True when requestedCategory matched an existing category */
  categoryMatched: boolean;
  sizes: string[];
  colors: AiDraftColor[];
  /** Null when the owner said "in stock" without a number — owner must set it */
  stockQuantity: number | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  /** Fields the AI could not determine — the owner fills these manually */
  missingFields: AiMissingField[];
  /** Uploaded photos attached to this draft (existing /uploads URLs) */
  imageUrls: string[];
}

export type AiMissingField =
  | "name"
  | "description"
  | "price"
  | "category"
  | "stock";

export interface AiAssistantResult {
  /** Friendly summary line, e.g. "Got it — I prepared 2 products." */
  notes: string;
  /** Visual observations from the uploaded photos (may be empty) */
  visualNotes: string[];
  products: AiProductDraft[];
}

export interface AiParseResponse {
  notes: string;
  visualNotes: string[];
  products: AiProductDraft[];
}
