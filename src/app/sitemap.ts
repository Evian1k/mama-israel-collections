import type { MetadataRoute } from "next";
import { categoriesApi, productsApi } from "@/services/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap: static pages + every active category + product page.
 * Product/category URLs come from the API service layer, so the sitemap
 * automatically grows with the catalogue (Phase 2 backend included).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/shipping`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/privacy-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [categories, products] = await Promise.all([
      categoriesApi.list().catch(() => []),
      productsApi.list({ limit: 48, sort: "newest" }).catch(() => ({ items: [] as Array<{ slug: string; updatedAt: string }> })),
    ]);

    const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${siteUrl}/shop/${category.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    const productEntries: MetadataRoute.Sitemap = (products.items ?? []).map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticEntries, ...categoryEntries, ...productEntries];
  } catch {
    // Never fail the sitemap because the API is unreachable
    return staticEntries;
  }
}
