import type { Metadata } from "next";
import { ShopView } from "@/components/shop/shop-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop — Dresses, Tops & More",
  description:
    "Browse the full Mama Israel Collections — dresses, tops, skirts and statement pieces curated with love and delivered across Kenya.",
};

export default function ShopPage() {
  return <ShopView />;
}
