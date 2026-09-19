import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { NewArrivalsShowcase, FeaturedShowcase } from "@/components/home/product-showcase";
import { WhyShop } from "@/components/home/why-shop";
import { WhatsAppCta } from "@/components/home/whatsapp-cta";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { storeConfig } from "@/config/store";

// Home content is live store data — always render fresh.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PAGE_TITLE = "Elegance Made for You — Women's Fashion in Kenya";

export const metadata: Metadata = {
  title: {
    absolute: PAGE_TITLE,
  },
  description: storeConfig.description,
  openGraph: {
    title: PAGE_TITLE,
    description: storeConfig.description,
    url: SITE_URL,
    siteName: storeConfig.name,
    images: [
      {
        url: "/images/hero.png",
        width: 864,
        height: 1152,
        alt: storeConfig.content.hero.imageAlt,
      },
    ],
  },
};

/** Organization structured data for search engines */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: storeConfig.name,
  url: SITE_URL,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Hero />
      <CategoryShowcase />
      <NewArrivalsShowcase />
      <FeaturedShowcase />
      <WhyShop />
      <WhatsAppCta />
      <NewsletterSection />
    </>
  );
}
