import type { Metadata } from "next";

import { EditProductPage } from "@/components/admin/products/edit-product-page";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditProductPage id={id} />;
}
