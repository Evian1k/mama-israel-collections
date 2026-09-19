import type { Metadata } from "next";
import { categoriesApi } from "@/services/api/categories";
import { ShopView } from "@/components/shop/shop-view";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;

  let title = slug; // fallback until the category is confirmed to exist
  let description: string | undefined;

  try {
    const categories = await categoriesApi.list();
    const category = categories.find((candidate) => candidate.slug === slug);
    if (category) {
      title = category.name;
      description = category.description || undefined;
    }
  } catch {
    // Metadata is best-effort — the page itself handles errors gracefully
  }

  return {
    title: `${title} — Shop`,
    description:
      description ??
      `Shop ${title} at Mama Israel Collections — pieces curated with love and delivered across Kenya.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  // Unknown slugs still render the shop — the grid shows a helpful empty state
  return <ShopView initialCategorySlug={slug} />;
}
