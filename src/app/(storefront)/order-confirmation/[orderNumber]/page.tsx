import type { Metadata } from "next";
import { OrderConfirmationView } from "@/components/checkout/order-confirmation-view";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Thank you for your order — here is everything we have for it.",
};

/**
 * Server component: reads the order number from the dynamic segment and hands
 * off to the client view (which fetches via the useOrder hook). Data is never
 * fetched here so that the 404 / error / success handling stays in one place.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderConfirmationView orderNumber={orderNumber} />;
}
