/* eslint-disable no-console */
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Same PostgreSQL-only guard as the API: ignore inherited file: DATABASE_URLs
const fileEnv = dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true }).parsed ?? {};
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  if (fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
}

/**
 * ============================================================================
 * DEV-ONLY SEED — clearly-labelled sample catalogue.
 * ============================================================================
 *  - NEVER runs automatically.
 *  - Refuses to run in production (NODE_ENV=production aborts).
 *  - Everything is prefixed "Sample:" so it is obvious in the admin and on the
 *    storefront preview.
 *  - Production starts EMPTY unless real business data is intentionally
 *    imported (via the admin UI or a dedicated import script).
 *
 * Run explicitly with:  bun run db:seed
 * Wipe with:            bun run db:seed -- --clear
 * ============================================================================
 */

const prisma = new PrismaClient();

const SAMPLE_CATEGORIES = [
  {
    name: "Sample: Dresses",
    slug: "sample-dresses",
    description: "Sample dresses used to preview the storefront (not real stock).",
    sortOrder: 0,
  },
  {
    name: "Sample: Tops & Blouses",
    slug: "sample-tops",
    description: "Sample tops used to preview the storefront (not real stock).",
    sortOrder: 1,
  },
  {
    name: "Sample: Skirts",
    slug: "sample-skirts",
    description: "Sample skirts used to preview the storefront (not real stock).",
    sortOrder: 2,
  },
];

const SIZES = ["XS", "S", "M", "L", "XL"];
const COLORS = [
  { name: "Burgundy", hex: "#7A2235" },
  { name: "Cream", hex: "#F5EFE3" },
  { name: "Black", hex: "#1C1917" },
  { name: "Olive", hex: "#6B7250" },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function clear(): Promise<void> {
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log("✔ Cleared all sample + real catalogue data (orders, products, categories).");
}

async function seed(): Promise<void> {
  const categories: Record<string, string> = {};
  for (const c of SAMPLE_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { description: c.description },
    });
    categories[c.slug] = row.id;
  }

  const products = [
    {
      name: "Sample: Maasai Wrap Dress",
      slug: "sample-maasai-wrap-dress",
      description:
        "SAMPLE DATA — flowing wrap dress with a subtle earth-tone pattern, elastic waist tie and side pockets. Perfect for Sunday afternoons.",
      categoryId: categories["sample-dresses"],
      price: 4500,
      compareAtPrice: 5200,
      sku: "SAMPLE-0001",
      sizes: ["S", "M", "L", "XL"],
      colors: [COLORS[0], COLORS[1]],
      stockQuantity: 8,
      lowStockThreshold: 2,
      isFeatured: true,
      isNewArrival: true,
      createdAt: daysAgo(1),
    },
    {
      name: "Sample: Evening Gala Gown",
      slug: "sample-evening-gala-gown",
      description:
        "SAMPLE DATA — floor-length evening gown with a fitted bodice and soft chiffon skirt. Made for celebrations.",
      categoryId: categories["sample-dresses"],
      price: 7800,
      compareAtPrice: null,
      sku: "SAMPLE-0002",
      sizes: ["M", "L"],
      colors: [COLORS[2], COLORS[0]],
      stockQuantity: 3,
      lowStockThreshold: 2,
      isFeatured: true,
      isNewArrival: false,
      createdAt: daysAgo(2),
    },
    {
      name: "Sample: Kitenge Print Blouse",
      slug: "sample-kitenge-print-blouse",
      description:
        "SAMPLE DATA — relaxed-fit blouse in a bold kitenge print with mother-of-pearl buttons.",
      categoryId: categories["sample-tops"],
      price: 2200,
      compareAtPrice: null,
      sku: "SAMPLE-0003",
      sizes: ["XS", "S", "M", "L"],
      colors: [COLORS[3], COLORS[1]],
      stockQuantity: 12,
      lowStockThreshold: 3,
      isFeatured: false,
      isNewArrival: true,
      createdAt: daysAgo(0),
    },
    {
      name: "Sample: Silk Touch Camisole",
      slug: "sample-silk-touch-camisole",
      description:
        "SAMPLE DATA — lightweight camisole with adjustable straps; layers beautifully under blazers.",
      categoryId: categories["sample-tops"],
      price: 1500,
      compareAtPrice: 1800,
      sku: "SAMPLE-0004",
      sizes: ["S", "M", "L"],
      colors: [COLORS[1], COLORS[2]],
      stockQuantity: 2,
      lowStockThreshold: 3,
      isFeatured: false,
      isNewArrival: true,
      createdAt: daysAgo(1),
    },
    {
      name: "Sample: Pleated Maxi Skirt",
      slug: "sample-pleated-maxi-skirt",
      description:
        "SAMPLE DATA — high-waisted pleated maxi skirt with a hidden zip and graceful movement.",
      categoryId: categories["sample-skirts"],
      price: 3200,
      compareAtPrice: null,
      sku: "SAMPLE-0005",
      sizes: ["S", "M", "L", "XL"],
      colors: [COLORS[0], COLORS[3]],
      stockQuantity: 6,
      lowStockThreshold: 2,
      isFeatured: true,
      isNewArrival: false,
      createdAt: daysAgo(3),
    },
    {
      name: "Sample: Denim Wrap Skirt",
      slug: "sample-denim-wrap-skirt",
      description:
        "SAMPLE DATA — mid-weight denim wrap skirt with contrast stitching; easy to dress up or down.",
      categoryId: categories["sample-skirts"],
      price: 2800,
      compareAtPrice: null,
      sku: "SAMPLE-0006",
      sizes: ["M", "L"],
      colors: [COLORS[2]],
      stockQuantity: 1,
      lowStockThreshold: 2,
      isFeatured: false,
      isNewArrival: true,
      createdAt: daysAgo(0),
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: p,
      update: { stockQuantity: p.stockQuantity, price: p.price },
    });
  }

  console.log("✔ Seeded 3 sample categories + 6 sample products (all prefixed 'Sample:').");
  console.log("  These are NOT real stock — wipe any time with `bun run db:seed -- --clear`.");
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error("✖ Refusing to seed: production must start empty.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.includes("--clear")) {
    await clear();
  } else {
    await seed();
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
