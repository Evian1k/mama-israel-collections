import { ApiError } from "@/services/api/client";
import { effectivePrice } from "@/lib/product-utils";
import { getDb } from "./db";
import { generateId, slugify, uniqueSlug } from "./ids";
import type {
  Category,
  CreateProductInput,
  Paginated,
  Product,
  ProductImage,
  ProductQuery,
  UpdateProductInput,
} from "@/types";

/**
 * Product repository for the dev adapter.
 * The filtering/sorting/pagination logic mirrors what the Phase 2 backend
 * will do in PostgreSQL (see docs/BACKEND_IMPLEMENTATION_PLAN.md §17,19).
 */

function withCategory(product: Product): Product {
  const db = getDb();
  return {
    ...product,
    category: db.categories.find((c) => c.id === product.categoryId) ?? null,
  };
}

function matchesQuery(product: Product, q: ProductQuery): boolean {
  if (!q.includeInactive && !product.isActive) return false;

  if (q.categoryId && product.categoryId !== q.categoryId) return false;
  if (q.categorySlug) {
    const cat = getDb().categories.find((c) => c.id === product.categoryId);
    if (!cat || cat.slug !== q.categorySlug) return false;
  }

  if (typeof q.minPrice === "number" && effectivePrice(product) < q.minPrice) return false;
  if (typeof q.maxPrice === "number" && effectivePrice(product) > q.maxPrice) return false;

  if (q.sizes && q.sizes.length > 0) {
    const hit = q.sizes.some((s) => product.sizes.includes(s));
    if (!hit) return false;
  }

  if (q.colors && q.colors.length > 0) {
    const wanted = q.colors.map((c) => c.toLowerCase());
    const hit = product.colors.some((c) => wanted.includes(c.name.toLowerCase()));
    if (!hit) return false;
  }

  if (q.featured && !product.isFeatured) return false;
  if (q.newArrival && !product.isNewArrival) return false;
  if (q.inStock && product.stockQuantity <= 0) return false;

  if (q.search) {
    const needle = q.search.toLowerCase();
    const haystack = `${product.name} ${product.description} ${product.sku}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function sortProducts(products: Product[], sort: ProductQuery["sort"]): Product[] {
  const list = [...products];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price_desc":
      return list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "name_asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
      return list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    case "newest":
    default:
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export function queryProducts(q: ProductQuery): Paginated<Product> {
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(48, Math.max(1, q.limit ?? 12));

  const filtered = db.products.filter((p) => matchesQuery(p, q));
  const sorted = sortProducts(filtered, q.sort);

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit).map(withCategory);

  return {
    items,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

export function findProductBySlugOrId(slugOrId: string): Product | null {
  const db = getDb();
  const found = db.products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  return found ? withCategory(found) : null;
}

export function getFeaturedProducts(limit = 8): Product[] {
  const db = getDb();
  return sortProducts(
    db.products.filter((p) => p.isActive && p.isFeatured),
    "newest"
  )
    .slice(0, limit)
    .map(withCategory);
}

export function getNewArrivals(limit = 8): Product[] {
  const db = getDb();
  return sortProducts(
    db.products.filter((p) => p.isActive && p.isNewArrival),
    "newest"
  )
    .slice(0, limit)
    .map(withCategory);
}

function buildImages(
  productId: string,
  images: CreateProductInput["images"]
): ProductImage[] {
  const list = (images ?? []).filter((img) => img.url);
  if (list.length === 0) return [];
  return list.map((img, index) => ({
    id: generateId("img"),
    url: img.url,
    alt: img.alt || "",
    isPrimary: list.findIndex((i) => i.isPrimary) === index ? true : index === 0 && !list.some((i) => i.isPrimary),
    sortOrder: img.sortOrder ?? index,
  }));
}

function assertCategoryExists(categoryId: string): void {
  const db = getDb();
  if (!db.categories.some((c) => c.id === categoryId)) {
    throw new ApiError("The selected category no longer exists.", 400, "VALIDATION_ERROR");
  }
}

export function createProduct(input: CreateProductInput): Product {
  const db = getDb();
  assertCategoryExists(input.categoryId);

  const taken = new Set(db.products.map((p) => p.slug));
  const slug = input.slug ? uniqueSlug(input.slug, taken) : uniqueSlug(input.name, taken);
  const now = new Date().toISOString();
  db.seq.product += 1;

  const product: Product = {
    id: generateId("prd"),
    name: input.name,
    slug,
    description: input.description,
    categoryId: input.categoryId,
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    sku:
      input.sku?.trim() ||
      `MIC-${String(db.seq.product).padStart(4, "0")}`,
    images: buildImages("new", input.images),
    sizes: input.sizes ?? [],
    colors: input.colors ?? [],
    stockQuantity: input.stockQuantity,
    lowStockThreshold: input.lowStockThreshold ?? db.settings.lowStockThreshold,
    isFeatured: input.isFeatured ?? false,
    isNewArrival: input.isNewArrival ?? true,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  db.products.push(product);
  return withCategory(product);
}

export function updateProduct(id: string, input: UpdateProductInput): Product {
  const db = getDb();
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    throw new ApiError("Product not found.", 404, "PRODUCT_NOT_FOUND");
  }
  if (input.categoryId && input.categoryId !== product.categoryId) {
    assertCategoryExists(input.categoryId);
  }

  if (input.slug && input.slug !== product.slug) {
    const taken = new Set(
      db.products.filter((p) => p.id !== id).map((p) => p.slug)
    );
    product.slug = uniqueSlug(input.slug, taken);
  }

  if (input.name !== undefined) product.name = input.name;
  if (input.description !== undefined) product.description = input.description;
  if (input.categoryId !== undefined) product.categoryId = input.categoryId;
  if (input.price !== undefined) product.price = input.price;
  if (input.compareAtPrice !== undefined) product.compareAtPrice = input.compareAtPrice;
  if (input.sku !== undefined) product.sku = input.sku;
  if (input.images !== undefined) product.images = buildImages(product.id, input.images);
  if (input.sizes !== undefined) product.sizes = input.sizes;
  if (input.colors !== undefined) product.colors = input.colors;
  if (input.stockQuantity !== undefined) product.stockQuantity = input.stockQuantity;
  if (input.lowStockThreshold !== undefined) product.lowStockThreshold = input.lowStockThreshold;
  if (input.isFeatured !== undefined) product.isFeatured = input.isFeatured;
  if (input.isNewArrival !== undefined) product.isNewArrival = input.isNewArrival;
  if (input.isActive !== undefined) product.isActive = input.isActive;
  product.updatedAt = new Date().toISOString();

  return withCategory(product);
}

export function deleteProduct(id: string): void {
  const db = getDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new ApiError("Product not found.", 404, "PRODUCT_NOT_FOUND");
  }
  db.products.splice(index, 1);
}

/** Auto-suggest a SKU from the product name */
export function suggestSku(name: string): string {
  const db = getDb();
  db.seq.product += 1;
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.slice(0, 3))
    .join("-");
  return `${letters || "MIC"}-${String(db.seq.product).padStart(4, "0")}`;
}

export { slugify };
