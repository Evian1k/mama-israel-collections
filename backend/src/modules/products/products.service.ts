import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { mapProduct, mapCategory, paginated, primaryImageUrl } from "../../lib/mappers";
import type { Paginated } from "../../shared/api-types";
import { EFFECTIVE_PRICE_SQL, effectivePrice } from "../../lib/pricing";
import { ApiError } from "../../lib/errors";
import { skuFromCount, uniqueSlug } from "../../lib/slugs";
import type {
  CreateProductInput,
  Product,
  ProductQuery,
  ProductSort,
  UpdateProductInput,
} from "../../shared/api-types";
import { deleteStoredImage } from "../uploads/storage.service";
import type { z } from "zod";
import type { productInputSchema } from "../../lib/validation";

/**
 * ============================================================================
 * PRODUCT SERVICE
 * ============================================================================
 * - The public catalogue query runs as ONE parameterised SQL statement
 *   (filters + effective-price sorting + pagination) — no client-side filtering.
 * - Effective price = compareAtPrice when valid, else price — identical math
 *   to the frontend's product-utils.
 * - Variants: when a product has ProductVariant rows they hold the per
 *   size/colour stock and Product.stockQuantity is kept as the aggregate.
 * ============================================================================
 */

const productInclude = {
  images: true,
  category: true,
} satisfies Prisma.ProductInclude;

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function orderClause(sort: ProductSort | undefined): Prisma.Sql {
  switch (sort) {
    case "price_asc":
      return Prisma.sql`${EFFECTIVE_PRICE_SQL} ASC, p."createdAt" DESC`;
    case "price_desc":
      return Prisma.sql`${EFFECTIVE_PRICE_SQL} DESC, p."createdAt" DESC`;
    case "name_asc":
      return Prisma.sql`p."name" ASC`;
    case "featured":
      return Prisma.sql`p."isFeatured" DESC, p."createdAt" DESC`;
    case "newest":
    default:
      return Prisma.sql`p."createdAt" DESC`;
  }
}

interface ListOptions extends ProductQuery {
  includeInactive?: boolean;
}

export async function queryProducts(q: ListOptions): Promise<Paginated<Product>> {
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(48, Math.max(1, q.limit ?? 12));

  const conditions: Prisma.Sql[] = [];

  if (!q.includeInactive) conditions.push(Prisma.sql`p."isActive" = true`);
  if (q.categoryId) conditions.push(Prisma.sql`p."categoryId" = ${q.categoryId}`);
  if (q.categorySlug) conditions.push(Prisma.sql`c."slug" = ${q.categorySlug}`);
  if (typeof q.minPrice === "number") conditions.push(Prisma.sql`${EFFECTIVE_PRICE_SQL} >= ${q.minPrice}`);
  if (typeof q.maxPrice === "number") conditions.push(Prisma.sql`${EFFECTIVE_PRICE_SQL} <= ${q.maxPrice}`);

  if (q.sizes && q.sizes.length > 0) {
    conditions.push(
      Prisma.sql`p."sizes" && ARRAY[${Prisma.join(q.sizes.map((s) => Prisma.sql`${s}`))}]::text[]`
    );
  }

  if (q.colors && q.colors.length > 0) {
    const lowered = q.colors.map((c) => c.toLowerCase());
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(p."colors") AS color
        WHERE lower(color->>'name') = ANY(ARRAY[${Prisma.join(
          lowered.map((c) => Prisma.sql`${c}`)
        )}]::text[])
      )`
    );
  }

  if (q.featured) conditions.push(Prisma.sql`p."isFeatured" = true`);
  if (q.newArrival) conditions.push(Prisma.sql`p."isNewArrival" = true`);
  if (q.inStock) conditions.push(Prisma.sql`p."stockQuantity" > 0`);

  if (q.search && q.search.trim() !== "") {
    const like = `%${escapeLike(q.search.trim())}%`;
    conditions.push(
      Prisma.sql`(p."name" ILIKE ${like} OR p."description" ILIKE ${like} OR p."sku" ILIKE ${like} OR c."name" ILIKE ${like})`
    );
  }

  const where =
    conditions.length > 0
      ? Prisma.sql` WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const [countRows, idRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*) AS count
        FROM "Product" p
        LEFT JOIN "Category" c ON c."id" = p."categoryId"
        ${where}
      `
    ),
    prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT p."id"
        FROM "Product" p
        LEFT JOIN "Category" c ON c."id" = p."categoryId"
        ${where}
        ORDER BY ${orderClause(q.sort)}
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `
    ),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const ids = idRows.map((r) => r.id);

  if (ids.length === 0) {
    return paginated([], page, limit, total);
  }

  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: productInclude,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => Boolean(row))
    .map((row) => mapProduct(row));

  return paginated(items, page, limit, total);
}

// ------------------------------ Lookups ------------------------------------

export async function findPublicProduct(slugOrId: string): Promise<Product | null> {
  const product = await prisma.product.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }], isActive: true },
    include: productInclude,
  });
  return product ? mapProduct(product) : null;
}

export async function findAdminProduct(id: string): Promise<Product> {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { ...productInclude, variants: true },
  });
  if (!product) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");
  return mapProduct(product);
}

export async function getFeatured(limit = 8): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    take: Math.min(24, Math.max(1, limit)),
  });
  return rows.map(mapProduct);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isNewArrival: true },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    take: Math.min(24, Math.max(1, limit)),
  });
  return rows.map(mapProduct);
}

export async function searchProducts(term: string, limit = 8): Promise<Product[]> {
  const needle = term.trim();
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: needle, mode: "insensitive" } },
        { description: { contains: needle, mode: "insensitive" } },
        { sku: { contains: needle, mode: "insensitive" } },
      ],
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
    take: Math.min(24, Math.max(1, limit)),
  });
  return rows.map(mapProduct);
}

// ------------------------------ Images / variants --------------------------

interface ImageInput {
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

function normaliseImages(images: ImageInput[] | undefined): ImageInput[] {
  const list = (images ?? []).filter((img) => img.url && img.url.trim() !== "");
  if (list.length === 0) return [];
  const anyPrimary = list.some((i) => i.isPrimary);
  return list.map((img, index) => ({
    url: img.url.trim(),
    alt: img.alt ?? "",
    isPrimary: anyPrimary ? img.isPrimary : index === 0,
    sortOrder: img.sortOrder ?? index,
  }));
}

type VariantInput = z.output<typeof productInputSchema>["variants"];

function sumVariantStock(variants: VariantInput): number | null {
  if (!variants || variants.length === 0) return null;
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

async function cleanupRemovedImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const referenced = await prisma.orderItem.count({ where: { imageUrl: { in: urls } } });
  if (referenced > 0) return; // historical order snapshots still point at them
  await Promise.all(urls.map((url) => deleteStoredImage(url).catch(() => undefined)));
}

async function nextSku(preferred: string | undefined): Promise<string> {
  if (preferred && preferred.trim() !== "") {
    const taken = await prisma.product.findUnique({ where: { sku: preferred.trim() } });
    if (taken) {
      throw ApiError.conflict(`SKU "${preferred.trim()}" is already in use.`, "SKU_TAKEN");
    }
    return preferred.trim();
  }
  let count = await prisma.product.count();
  for (let i = 0; i < 1000; i += 1) {
    const candidate = skuFromCount(count + i);
    const taken = await prisma.product.findUnique({ where: { sku: candidate } });
    if (!taken) return candidate;
  }
  return `MIC-${Date.now().toString(36).toUpperCase()}`;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw ApiError.validation("The selected category no longer exists.");
  }
}

// ------------------------------ Create / update / delete -------------------

export async function createProduct(input: CreateProductInput): Promise<Product> {
  await assertCategoryExists(input.categoryId);

  const slug = await uniqueSlug(input.slug ?? input.name, (c) =>
    prisma.product.findUnique({ where: { slug: c } }).then(Boolean)
  );
  const sku = await nextSku(input.sku);

  const images = normaliseImages(input.images);
  const variantStock = sumVariantStock(input.variants);
  const stockQuantity = variantStock !== null ? variantStock : input.stockQuantity;

  const created = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      sku,
      sizes: input.sizes ?? [],
      colors: (input.colors ?? []) as unknown as Prisma.InputJsonArray,
      stockQuantity,
      lowStockThreshold: input.lowStockThreshold ?? (await getSettingsLowStockDefault()),
      isFeatured: input.isFeatured ?? false,
      isNewArrival: input.isNewArrival ?? true,
      isActive: input.isActive ?? true,
      images: {
        create: images.map((img) => ({
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        })),
      },
      variants:
        input.variants && input.variants.length > 0
          ? {
              create: input.variants.map((v) => ({
                size: v.size ?? null,
                color: v.color ?? null,
                sku: v.sku ?? null,
                stock: v.stock,
              })),
            }
          : undefined,
    },
    include: productInclude,
  });

  return mapProduct(created);
}

async function getSettingsLowStockDefault(): Promise<number> {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "main" } });
  return settings?.lowStockThreshold ?? 3;
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    slug = await uniqueSlug(input.slug, (c) =>
      prisma.product
        .findUnique({ where: { slug: c } })
        .then((found) => Boolean(found && found.id !== id))
    );
  }

  let sku = existing.sku;
  if (input.sku !== undefined && input.sku.trim() !== "" && input.sku.trim() !== existing.sku) {
    sku = await nextSku(input.sku.trim());
  }

  const data: Prisma.ProductUpdateInput = { slug, sku };
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
  if (input.price !== undefined) data.price = input.price;
  if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;
  if (input.sizes !== undefined) data.sizes = input.sizes;
  if (input.colors !== undefined) {
    data.colors = input.colors as unknown as Prisma.InputJsonArray;
  }
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.isNewArrival !== undefined) data.isNewArrival = input.isNewArrival;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  // Stock: variants (when provided, non-empty) hold per-combo stock and the
  // aggregate is recomputed; otherwise the product-level field is authoritative.
  const variantStock = sumVariantStock(input.variants);
  if (variantStock !== null) {
    data.stockQuantity = variantStock;
  } else if (input.variants !== undefined && input.variants.length === 0) {
    // Explicit empty array clears variants; product-level stock takes over.
    if (input.stockQuantity !== undefined) data.stockQuantity = input.stockQuantity;
  } else if (input.stockQuantity !== undefined) {
    data.stockQuantity = input.stockQuantity;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Replace images when provided
    if (input.images !== undefined) {
      const newImages = normaliseImages(input.images);
      const removedUrls = existing.images
        .map((img) => img.url)
        .filter((url) => !newImages.some((img) => img.url === url));
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (newImages.length > 0) {
        await tx.productImage.createMany({
          data: newImages.map((img) => ({
            productId: id,
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        });
      }
      // Fire-and-forget storage cleanup (never blocks the update)
      void cleanupRemovedImages(removedUrls);
    }

    // Replace variants when provided
    if (input.variants !== undefined) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (input.variants.length > 0) {
        await tx.productVariant.createMany({
          data: input.variants.map((v) => ({
            productId: id,
            size: v.size ?? null,
            color: v.color ?? null,
            sku: v.sku ?? null,
            stock: v.stock,
          })),
        });
      }
    }

    return tx.product.update({
      where: { id },
      data,
      include: productInclude,
    });
  });

  return mapProduct(updated);
}

export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing) throw ApiError.notFound("Product not found.", "PRODUCT_NOT_FOUND");

  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2014")
    ) {
      throw ApiError.conflict(
        "This product has orders and cannot be deleted. Deactivate it instead.",
        "CONFLICT"
      );
    }
    throw error;
  }

  // Safe to clean stored files — no order items reference the product anymore.
  const urls = existing.images.map((img) => img.url);
  const referenced = await prisma.orderItem.count({ where: { imageUrl: { in: urls } } });
  if (referenced === 0) {
    await Promise.all(urls.map((url) => deleteStoredImage(url).catch(() => undefined)));
  }
}

// ------------------------------ Variants (order-time) ----------------------

export type ProductWithVariants = Prisma.ProductGetPayload<{ include: { variants: true } }>;

export async function findProductsWithVariants(ids: string[]): Promise<ProductWithVariants[]> {
  if (ids.length === 0) return [];
  return prisma.product.findMany({
    where: { id: { in: ids } },
    include: {
      variants: true,
      images: true,
    },
  });
}

export { effectivePrice, mapProduct, mapCategory, primaryImageUrl };
