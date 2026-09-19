import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { ProductDetail } from "@/components/product/product-detail";
import { ApiError } from "@/services/api/client";
import { productsApi } from "@/services/api/products";
import { primaryImage } from "@/lib/product-utils";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await productsApi.bySlug(slug);
    const image = primaryImage(product);
    const description = product.description
      ? product.description.replace(/\s+/g, " ").trim().slice(0, 160)
      : undefined;

    return {
      title: product.name,
      description,
      openGraph: {
        type: "website",
        title: product.name,
        description,
        images: image ? [{ url: image.url, alt: image.alt || product.name }] : undefined,
      },
    };
  } catch {
    // Minimal metadata — the page body handles 404s and errors gracefully
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await productsApi.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    // Any other failure: keep the layout, show a friendly retry state
    return (
      <div className="container-page py-16">
        <ErrorState
          title="We could not load this piece"
          message="Something went wrong on our side. Please try again in a moment, or browse the full collection in the shop."
        />
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/shop">Browse the shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ProductDetail slug={slug} initialProduct={product} />;
}
