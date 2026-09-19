import type { Metadata } from "next";

import { AdminProductsView } from "@/components/admin/products/admin-products-view";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsView />;
}
