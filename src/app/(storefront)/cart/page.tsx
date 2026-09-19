import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your Shopping Bag",
  description:
    "Review the pieces in your bag, adjust quantities and check out — delivered across Kenya.",
};

export default function CartPage() {
  return <CartView />;
}
