import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Place your order with Mama Israel Collections — pay on delivery, confirmed personally before we ship.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
