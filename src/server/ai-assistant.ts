import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { ApiError } from "@/services/api/client";
import { listCategories } from "@/server/dev-store/categories";
import { slugify } from "@/server/dev-store/ids";
import { getBackendUrl, isBackendMode } from "@/lib/runtime-mode";
import { colorWithHex } from "@/lib/color-names";
import type { AiAssistantResult, AiMissingField, AiProductDraft } from "@/types";

/**
 * ============================================================================
 * AI PRODUCT ASSISTANT — server-side engine (admin only)
 * ============================================================================
 * Turns the owner's natural-language description into product DRAFTS.
 *
 * Guarantees:
 *  - Runs ONLY inside authenticated admin API routes (the SDK is never
 *    imported client-side and credentials never leave the server).
 *  - The AI is called once per "Create Product" click — never in the
 *    background, never on a schedule (cost control).
 *  - The AI never writes to the product database. It only proposes draft
 *    fields; publishing goes through the existing admin products API with
 *    full Zod validation (productInputSchema).
 *  - Missing information is reported, never invented. Category names are
 *    matched against the store's REAL categories; unknown categories are
 *    returned as "not found" so the owner can decide.
 * ============================================================================
 */

const MAX_TEXT_LENGTH = 4000;
const MAX_PRODUCTS_PER_PARSE = 10;
const MAX_IMAGE_URLS = 10;

/** Canonical hex values for common colour names live in @/lib/color-names. */

/** Soft schema for one AI-proposed product (values sanitised afterwards). */
const aiProductSchema = z.object({
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  price: z.number().positive().max(10_000_000).nullable().optional(),
  compareAtPrice: z.number().positive().max(10_000_000).nullable().optional(),
  categoryRequest: z.string().trim().max(80).nullable().optional(),
  sizes: z.array(z.string().trim().max(20)).max(20).optional(),
  colors: z.array(z.string().trim().max(40)).max(20).optional(),
  stockQuantity: z.number().int().min(0).max(100_000).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
});

const aiResponseSchema = z.object({
  products: z.array(aiProductSchema).min(1).max(MAX_PRODUCTS_PER_PARSE),
  notes: z.string().trim().max(600).optional(),
});

const visualHintsSchema = z.object({
  clothingType: z.string().trim().max(120).optional(),
  colors: z.array(z.string().trim().max(40)).max(6).optional(),
  pattern: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const aiAssistantRequestSchema = z.object({
  text: z.string().trim().min(3, "Describe the product you want to add").max(MAX_TEXT_LENGTH),
  /** Already-uploaded photos (existing /uploads/... URLs from the uploads API) */
  imageUrls: z.array(z.string().trim().max(300)).max(MAX_IMAGE_URLS).optional(),
});

function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^[\s\S]*?```(?:json)?/i, (match) => (match.includes("```") ? "" : match))
    .replace(/```[\s\S]*$/i, "")
    .trim();
  const candidate = cleaned || raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new ApiError(
      "The AI returned an unreadable response. Please try again.",
      502,
      "AI_BAD_RESPONSE"
    );
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new ApiError(
      "The AI returned an unreadable response. Please try again.",
      502,
      "AI_BAD_RESPONSE"
    );
  }
}

/** Map a colour name to a hex swatch (deterministic, no AI involved). */
function normalizeColor(name: string): { name: string; hex: string } {
  return colorWithHex(name);
}

function matchCategory(
  request: string | null | undefined,
  categories: Array<{ id: string; name: string; slug: string }>
): { id: string } | null {
  if (!request) return null;
  const wanted = slugify(request);
  if (!wanted) return null;
  return (
    categories.find((c) => slugify(c.name) === wanted || c.slug === wanted) ??
    categories.find(
      (c) =>
        slugify(c.name).includes(wanted) ||
        wanted.includes(slugify(c.name))
    ) ??
    null
  );
}

/**
 * Safe /uploads/... URL → bytes of the stored image.
 * - Backend mode: the file lives on the API server (or Cloudinary) — fetch it.
 * - Dev mode: read it from public/uploads with a path-traversal guard.
 * Rejects anything that is not a local /uploads/... path or a http(s) URL.
 */
async function loadImageBytes(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const fetchMimeFromExt = (candidate: string): string => {
    const ext = path.extname(candidate).slice(1).toLowerCase();
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "avif") return "image/avif";
    return "image/jpeg";
  };

  try {
    // Cloudinary / absolute URLs (backend mode with object storage)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, mime: response.headers.get("content-type") ?? fetchMimeFromExt(url) };
    }

    if (!url.startsWith("/uploads/")) return null;

    const safe = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, "");
    const filename = path.basename(safe);
    if (!filename || filename.startsWith(".")) return null;

    if (isBackendMode()) {
      // Local-disk storage on the API server, served at /uploads/<file>
      const response = await fetch(`${getBackendUrl()}/uploads/${filename}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, mime: response.headers.get("content-type") ?? fetchMimeFromExt(filename) };
    }

    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    const buffer = await readFile(filePath);
    return { buffer, mime: fetchMimeFromExt(filename) };
  } catch {
    return null;
  }
}

/**
 * Optional vision step — describes ONLY what is reliably visible (garment
 * type, dominant colours, pattern). Used as soft hints for the text parse.
 * Failures are non-fatal: the assistant works fine without it.
 */
async function describeProductImages(
  imageUrls: string[]
): Promise<{ hints: string; visualNotes: string[] }> {
  const first = imageUrls[0];
  const image = first ? await loadImageBytes(first) : null;
  if (!image) return { hints: "", visualNotes: [] };

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.createVision({
      model: "glm-4.5v",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Look at this clothing product photo for an online shop. Respond with ONLY a JSON object " +
                'of what is RELIABLY visible: {"clothingType": "...", "colors": ["..."], "pattern": "...", "notes": "..."}. ' +
                "Rules: only obvious visual facts (garment type, main colours, pattern style). " +
                'Never guess fabric, brand, quality or price. If unsure, use null or [].',
            },
            {
              type: "image_url",
              image_url: { url: `data:${image.mime};base64,${image.buffer.toString("base64")}` },
            },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = visualHintsSchema.safeParse(extractJson(raw));
    if (!parsed.success) return { hints: "", visualNotes: [] };

    const bits: string[] = [];
    if (parsed.data.clothingType) bits.push(`garment looks like: ${parsed.data.clothingType}`);
    if (parsed.data.colors?.length) bits.push(`visible colours: ${parsed.data.colors.join(", ")}`);
    if (parsed.data.pattern) bits.push(`pattern: ${parsed.data.pattern}`);
    if (parsed.data.notes) bits.push(parsed.data.notes);

    const visualNotes = bits.filter(Boolean);
    return {
      hints: visualNotes.length
        ? `\nVisual notes from the uploaded photo (observations only — the owner's text always wins): ${bits.join("; ")}.`
        : "",
      visualNotes,
    };
  } catch {
    // Vision is best-effort only.
    return { hints: "", visualNotes: [] };
  }
}

function buildSystemPrompt(categoryNames: string[], visualHints: string): string {
  return [
    "You are the AI Product Assistant for Mama Israel Collections, a women's fashion shop in Kenya (prices in KSh).",
    "The shop owner describes clothing in everyday language. You organise their words into product drafts.",
    "",
    "STRICT RULES:",
    "1. Extract ONLY information the owner explicitly gave. NEVER invent fabric, brand, quality,",
    "   stock numbers, or promotional claims ('premium', '100% cotton', 'luxury', 'best-selling').",
    "2. If the owner says 'in stock' without a number, set stockQuantity to null.",
    "3. prices are numbers in KSh without currency symbols or thousands separators.",
    "4. compareAtPrice ONLY when the owner mentions a sale/original/was-price.",
    "5. isFeatured / isNewArrival ONLY when the owner explicitly says featured or new arrival(s).",
    "6. description: write a short, warm 1-2 sentence shop description using ONLY the given details",
    "   (garment, colour, pattern, sizes, fabric ONLY if the owner stated it). If there is not enough",
    "   information for even one honest sentence, return description: null.",
    "7. sizes: normalise to uppercase labels like S, M, L, XL, XXL or numeric like 38 when the owner",
    "   uses them. Ranges like 'S to XL' expand to ['S','M','L','XL'].",
    "8. colors: simple colour NAMES only (e.g. Black, Red).",
    "9. categoryRequest: copy the owner's category wording (e.g. 'Dresses', \"Women's Ankara\").",
    "   These categories already exist in the shop: " +
      (categoryNames.length ? categoryNames.join(", ") : "(none yet)") + ".",
    "10. The owner may describe SEVERAL products at once (e.g. 'Add these three dresses') — return one",
    "    entry per product. Split only when the text clearly defines separate products.",
    "11. Respond with VALID JSON only, no markdown fences, matching exactly:",
    '    {"notes": "one friendly short sentence to the owner", "products": [...]}',
    visualHints,
  ].join("\n");
}

/** Real store categories in the active runtime mode (backend API or dev store). */
async function loadStoreCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  if (isBackendMode()) {
    try {
      const response = await fetch(`${getBackendUrl()}/api/categories`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          success: boolean;
          data?: Array<{ id: string; name: string; slug: string; isActive: boolean }>;
        };
        if (payload.success && Array.isArray(payload.data)) {
          return payload.data
            .filter((c) => c.isActive)
            .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
        }
      }
    } catch {
      // fall through to empty list — the owner picks/creates a category manually
    }
    return [];
  }
  return listCategories(true).map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}

/** Core parse — called only from the admin API route. */
export async function parseProductDescription(
  text: string,
  imageUrls: string[]
): Promise<AiAssistantResult> {
  const categories = await loadStoreCategories();

  // 1) Optional best-effort vision hints from the first uploaded photo.
  const { hints, visualNotes } =
    imageUrls.length > 0 ? await describeProductImages(imageUrls) : { hints: "", visualNotes: [] };

  // 2) One LLM call turns the owner's words into structured drafts.
  let zai: Awaited<ReturnType<typeof ZAI.create>>;
  try {
    zai = await ZAI.create();
  } catch {
    throw new ApiError(
      "The AI service is not available right now. Please add the product manually or try again later.",
      503,
      "AI_UNAVAILABLE"
    );
  }

  let completion;
  try {
    completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: buildSystemPrompt(categories.map((c) => c.name), hints) },
        { role: "user", content: text },
      ],
      thinking: { type: "disabled" },
    });
  } catch {
    throw new ApiError(
      "The AI could not process your description. Please try again in a moment.",
      502,
      "AI_REQUEST_FAILED"
    );
  }

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = aiResponseSchema.safeParse(extractJson(raw));
  if (!parsed.success || parsed.data.products.length === 0) {
    throw new ApiError(
      "I couldn't understand that as a product. Try including the item name, price and category — " +
        "for example: \"Black Ankara dress, KSh 3,500, sizes M-L, under Dresses.\"",
      422,
      "AI_NOT_UNDERSTOOD"
    );
  }

  // 3) Sanitise + map to the real store (categories, colours) — never trust raw AI values.
  const totalCount = parsed.data.products.length;
  const drafts: AiProductDraft[] = parsed.data.products.map((product, index) => {
    const category = matchCategory(product.categoryRequest, categories);
    const sizes = (product.sizes ?? [])
      .map((s) => s.toUpperCase().slice(0, 20))
      .filter((s) => /^[A-Z0-9./-]+$/.test(s))
      .slice(0, 20);

    const missing: AiMissingField[] = [];
    if (!product.name || product.name.length < 2) missing.push("name");
    if (!product.description || product.description.length < 10) missing.push("description");
    if (typeof product.price !== "number" || product.price <= 0) missing.push("price");
    if (!category) missing.push("category");
    if (typeof product.stockQuantity !== "number" || product.stockQuantity < 0) {
      missing.push("stock");
    }

    return {
      draftId: `draft_${Date.now()}_${index}`,
      name: product.name?.slice(0, 120) ?? "",
      description: product.description?.slice(0, 5000) ?? "",
      price: typeof product.price === "number" && product.price > 0 ? product.price : null,
      compareAtPrice:
        typeof product.compareAtPrice === "number" && product.compareAtPrice > 0
          ? product.compareAtPrice
          : null,
      categoryId: category?.id ?? null,
      requestedCategory: product.categoryRequest ?? null,
      categoryMatched: Boolean(category),
      sizes,
      colors: (product.colors ?? []).slice(0, 20).map(normalizeColor),
      stockQuantity:
        typeof product.stockQuantity === "number" && product.stockQuantity >= 0
          ? product.stockQuantity
          : null,
      isFeatured: product.isFeatured === true,
      isNewArrival: product.isNewArrival === true,
      missingFields: missing,
      // Photos: one product → all photos; N products + N photos → one each;
      // otherwise the first draft carries them (owner can move/remove later).
      imageUrls:
        totalCount === 1
          ? imageUrls
          : totalCount === imageUrls.length
            ? index < imageUrls.length
              ? [imageUrls[index]]
              : []
            : index === 0
              ? imageUrls
              : [],
    };
  });

  const count = drafts.length;
  const notes =
    parsed.data.notes?.slice(0, 400) ||
    (count === 1
      ? "Got it — I've prepared your product. Review it below, then publish."
      : `Got it — I've prepared ${count} product drafts. Review each one, then publish.`);

  return { notes, visualNotes, products: drafts };
}
