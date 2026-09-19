import type { Metadata } from "next";
import { AdminOrdersView } from "@/components/admin/orders/admin-orders-view";

export const metadata: Metadata = {
  title: "Orders",
  description: "Every order, from pending to delivered.",
};

export default function AdminOrdersPage() {
  return <AdminOrdersView />;
}
