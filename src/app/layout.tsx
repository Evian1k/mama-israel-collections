import type { Metadata, Viewport } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { storeConfig } from "@/config/store";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${storeConfig.name} — ${storeConfig.tagline.replaceAll("•", "|")}`,
    template: `%s | ${storeConfig.name}`,
  },
  description: storeConfig.description,
  keywords: [
    "Mama Israel Collections",
    "women's fashion Kenya",
    "dresses Nairobi",
    "African women's clothing",
    "online boutique Kenya",
  ],
  authors: [{ name: storeConfig.name }],
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: siteUrl,
    siteName: storeConfig.name,
    title: `${storeConfig.name} — ${storeConfig.tagline.replaceAll("•", "|")}`,
    description: storeConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${storeConfig.name} — ${storeConfig.tagline.replaceAll("•", "|")}`,
    description: storeConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#7a2235",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${playfair.variable} ${jost.variable} bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
