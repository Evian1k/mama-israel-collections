import type { Metadata } from "next";
import { ContactView } from "@/components/contact/contact-view";
import { storeConfig } from "@/config/store";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Questions about a piece, your order or delivery? Reach ${storeConfig.name} on WhatsApp, phone or email — or send us a message and we will get back to you.`,
};

export default function ContactPage() {
  return <ContactView />;
}
