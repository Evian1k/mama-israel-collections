import type { Metadata } from "next";
import { AdminOrderDetail } from "@/components/admin/orders/admin-order-detail";

export const metadata: Metadata = {
  title: "Order detail",
  description: "Manage a single order — status, payment, customer and items.",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOrderDetail id={id} />;
}
