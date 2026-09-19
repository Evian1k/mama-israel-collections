import { getDb, resetDb } from "./db";
import { createCategory } from "./categories";
import { createProduct } from "./products";
import type { CreateProductInput } from "@/types";

/**
 * ============================================================================
 * DEVELOPMENT SAMPLE FIXTURES — opt-in only, never production data
 * ============================================================================
 * The application NEVER loads this automatically. The owner can preview the
 * full experience (product grids, details, filters, checkout) from
 * Admin → Settings → "Development data" with one click, and wipe it again.
 *
 * Every sample is visibly prefixed with "Sample:" and uses SMPL- SKUs /
 * sample- category slugs so `clearSampleData()` can remove exactly these.
 * ============================================================================
 */

const SAMPLE_CATEGORIES = [
  {
    name: "Sample: Dresses",
    slug: "sample-dresses",
    description: "Development fixture category for dresses.",
    sortOrder: 0,
  },
  {
    name: "Sample: Tops",
    slug: "sample-tops",
    description: "Development fixture category for tops and blouses.",
    sortOrder: 1,
  },
  {
    name: "Sample: Skirts",
    slug: "sample-skirts",
    description: "Development fixture category for skirts.",
    sortOrder: 2,
  },
  {
    name: "Sample: Two-Piece Sets",
    slug: "sample-two-piece-sets",
    description: "Development fixture category for co-ord sets.",
    sortOrder: 3,
  },
];

const IMG = (name: string) => `/images/samples/${name}`;

function sampleProducts(categoryIdBySlug: Record<string, string>): CreateProductInput[] {
  const img = (url: string) => [{ url, alt: "Sample product photo (development fixture)", isPrimary: true, sortOrder: 0 }];

  return [
    {
      name: "Sample: Burgundy Ankara Wrap Dress",
      description:
        "Development fixture. A flowing wrap dress in deep burgundy with subtle print trim — shown to preview product pages, galleries and variants.",
      categoryId: categoryIdBySlug["sample-dresses"],
      price: 4500,
      compareAtPrice: 5500,
      images: img(IMG("sample-dress-1.png")),
      sizes: ["S", "M", "L", "XL"],
      colors: [
        { name: "Burgundy", hex: "#7A2235" },
        { name: "Cream", hex: "#F3EADB" },
      ],
      stockQuantity: 12,
      lowStockThreshold: 3,
      isFeatured: true,
      isNewArrival: true,
      isActive: true,
    },
    {
      name: "Sample: Golden Hour Maxi Dress",
      description:
        "Development fixture. A warm tiered maxi dress for previewing long-catalogue layouts and size charts.",
      categoryId: categoryIdBySlug["sample-dresses"],
      price: 5200,
      compareAtPrice: null,
      images: img(IMG("sample-dress-2.png")),
      sizes: ["S", "M", "L"],
      colors: [{ name: "Gold", hex: "#B98A4E" }],
      stockQuantity: 2,
      lowStockThreshold: 3,
      isFeatured: true,
      isNewArrival: true,
      isActive: true,
    },
    {
      name: "Sample: Champagne Satin Blouse",
      description:
        "Development fixture. A soft satin blouse used to preview the tops category and colour swatches.",
      categoryId: categoryIdBySlug["sample-tops"],
      price: 2800,
      compareAtPrice: null,
      images: img(IMG("sample-top-1.png")),
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: [
        { name: "Champagne", hex: "#E8D8BC" },
        { name: "Espresso", hex: "#4A3728" },
      ],
      stockQuantity: 0,
      lowStockThreshold: 3,
      isFeatured: false,
      isNewArrival: true,
      isActive: true,
    },
    {
      name: "Sample: Terracotta Pleated Skirt",
      description:
        "Development fixture. A pleated midi skirt for previewing filters, sorting and pagination.",
      categoryId: categoryIdBySlug["sample-skirts"],
      price: 3200,
      compareAtPrice: 3800,
      images: img(IMG("sample-skirt-1.png")),
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: [{ name: "Terracotta", hex: "#B06A3B" }],
      stockQuantity: 8,
      lowStockThreshold: 3,
      isFeatured: false,
      isNewArrival: false,
      isActive: true,
    },
    {
      name: "Sample: Kitenge Two-Piece Set",
      description:
        "Development fixture. A matching two-piece set used to preview multi-image galleries.",
      categoryId: categoryIdBySlug["sample-two-piece-sets"],
      price: 6400,
      compareAtPrice: null,
      images: [
        { url: IMG("sample-set-1.png"), alt: "Sample product photo (development fixture)", isPrimary: true, sortOrder: 0 },
        { url: IMG("sample-dress-1.png"), alt: "Alternate sample photo (development fixture)", isPrimary: false, sortOrder: 1 },
      ],
      sizes: ["S", "M", "L"],
      colors: [{ name: "Multi", hex: "#8A5A6E" }],
      stockQuantity: 5,
      lowStockThreshold: 2,
      isFeatured: true,
      isNewArrival: false,
      isActive: true,
    },
  ];
}

export function seedSampleData(): { categories: number; products: number } {
  clearSampleData();

  const categoryIdBySlug: Record<string, string> = {};
  for (const c of SAMPLE_CATEGORIES) {
    const created = createCategory({ ...c, isActive: true });
    categoryIdBySlug[c.slug] = created.id;
  }

  const products = sampleProducts(categoryIdBySlug);
  for (const p of products) {
    createProduct({ ...p, sku: undefined });
  }
  // Force sample SKUs after creation
  const db = getDb();
  db.products
    .filter((p) => p.name.startsWith("Sample:"))
    .forEach((p, i) => {
      p.sku = `SMPL-${String(i + 1).padStart(3, "0")}`;
    });

  return { categories: SAMPLE_CATEGORIES.length, products: products.length };
}

export function clearSampleData(): void {
  const db = getDb();
  db.products = db.products.filter(
    (p) => !p.name.startsWith("Sample:") && !p.sku.startsWith("SMPL-")
  );
  db.categories = db.categories.filter((c) => !c.slug.startsWith("sample-"));
}

export function resetDevData(): void {
  resetDb();
}
