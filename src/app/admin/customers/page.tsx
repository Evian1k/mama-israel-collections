import type { Metadata } from "next";
import { AdminCustomersView } from "@/components/admin/customers/admin-customers-view";

export const metadata: Metadata = {
  title: "Customers",
  description: "People who have ordered from you, built automatically from orders.",
};

export default function AdminCustomersPage() {
  return <AdminCustomersView />;
}
