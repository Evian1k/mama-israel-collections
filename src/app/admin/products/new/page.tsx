import type { Metadata } from "next";

import { NewProductPage } from "@/components/admin/products/new-product-page";

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export default function AdminNewProductPage() {
  return <NewProductPage />;
}
