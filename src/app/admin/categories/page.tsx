import type { Metadata } from "next";

import { AdminCategoriesView } from "@/components/admin/categories/admin-categories-view";

export const metadata: Metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesView />;
}
