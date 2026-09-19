/**
 * ============================================================================
 * MAMA ISRAEL COLLECTIONS — CENTRALIZED STORE CONFIGURATION
 * ============================================================================
 * Single source of truth for brand identity, navigation and editable content.
 *
 * The business owner can update everything in this file without touching any
 * component. In Phase 2 most of these values become editable from
 * Admin → Settings (stored in the database via `StoreSettings`).
 *
 * NOTE: No business facts (phone numbers, addresses, social handles, founding
 * dates...) are invented here. Values are intentionally empty until the real
 * information is provided — the UI gracefully hides anything not configured.
 * ============================================================================
 */

const env = (typeof process !== "undefined"
  ? (process.env as Record<string, string | undefined>)
  : {}) as Record<string, string | undefined>;

export const storeConfig = {
  /** Brand identity */
  name: "Mama Israel Collections",
  shortName: "Mama Israel",
  initials: "MI",
  tagline: "Style • Elegance • You",
  description:
    "Thoughtfully curated women's fashion from Kenya — dresses, tops, skirts and more, chosen to make every woman feel confident and beautifully herself.",

  /**
   * Contact details — REAL values to be provided by the business owner.
   * Also editable later via Admin → Settings (dev adapter) / database (Phase 2).
   * NEXT_PUBLIC_WHATSAPP_NUMBER env var pre-fills the default WhatsApp number.
   */
  contact: {
    phone: "",
    email: "",
    /** WhatsApp number in international format digits, e.g. "254712345678" */
    whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    location: "",
  },

  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
  },

  currency: {
    code: "KES",
    symbol: "KSh",
    locale: "en-KE",
  },

  /** Default country code hint used by phone inputs */
  phoneHint: "e.g. 0712 345 678 or +254 712 345 678",

  /** Convenience suggestions for the checkout delivery-location field */
  deliveryAreas: [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Thika",
    "Machakos",
    "Nyeri",
    "Malindi",
    "Kakamega",
  ],

  /**
   * Editable marketing copy — all safe to change, nothing is a business claim.
   */
  content: {
    hero: {
      eyebrow: "Mama Israel Collections",
      headline: "Elegance Made for You",
      subheadline:
        "Discover dresses, tops and statement pieces curated with love — designed to make every woman feel confident, graceful and beautifully herself.",
      primaryCta: { label: "Shop the Collection", href: "/shop" },
      secondaryCta: { label: "Chat on WhatsApp", href: "/contact" },
      imageAlt:
        "Elegant woman wearing a flowing burgundy dress from the Mama Israel Collections boutique",
    },
    whyShopWithUs: [
      {
        icon: "sparkles" as const,
        title: "Quality you can feel",
        description:
          "Every piece is hand-selected for fabric, finish and fit — nothing makes it to the rack unless we love it ourselves.",
      },
      {
        icon: "heart" as const,
        title: "Personal service",
        description:
          "Real conversations, honest advice and styling help. We treat every customer like family.",
      },
      {
        icon: "truck" as const,
        title: "Delivery across Kenya",
        description:
          "Order from anywhere and we will bring your pieces safely to your door or pick-up point.",
      },
      {
        icon: "message-circle" as const,
        title: "Order your way",
        description:
          "Shop online in minutes — or chat with us directly on WhatsApp and we will handle the rest personally.",
      },
    ],
    newsletter: {
      title: "Be first to see new arrivals",
      description:
        "Join our list for early access to new collections, restocks and special offers.",
      buttonLabel: "Subscribe",
      successMessage: "Karibu! You are on the list — watch your inbox for new arrivals.",
    },
    whatsappCta: {
      title: "Prefer to order on WhatsApp?",
      description:
        "Message us with what you love — sizes, colours, anything — and we will take care of the rest personally.",
      buttonLabel: "Start a WhatsApp chat",
    },
    about: {
      heroEyebrow: "Our Story",
      heroTitle: "Style. Elegance. You.",
      intro:
        "Mama Israel Collections is a Kenyan women's fashion destination built on a simple belief: every woman deserves to feel elegant in what she wears.",
      story: [
        "What began as a passion for beautiful, well-made clothing has grown into a carefully curated collection for women who want quality they can feel and style that feels like their own.",
        "We source every dress, top and skirt personally — paying attention to fabric, cut and finish — so that what arrives at your door is something we are proud to put our name on.",
        "Whether you are dressing for work, a celebration or an ordinary Tuesday that deserves a little sparkle, we are honoured to be part of how you show up in the world.",
      ],
      values: [
        {
          title: "Style",
          description:
            "Curated pieces that blend timeless silhouettes with fresh, modern detail — fashion that works for real life.",
        },
        {
          title: "Elegance",
          description:
            "Quality fabrics, thoughtful finishes and a standard of care that you can feel the moment you unbox.",
        },
        {
          title: "You",
          description:
            "You are the collection's true muse. Personal service, honest advice and pieces chosen to celebrate you.",
        },
      ],
      closingNote:
        "This story grows with the business. The owner can personalise every word of this page from the store configuration — no code changes required.",
    },
  },

  /** Primary customer navigation */
  navigation: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],

  /** Footer (customer-facing) */
  footer: {
    blurb:
      "A Kenyan women's fashion boutique offering curated dresses, tops, skirts and accessories — with personal service and countrywide delivery.",
    quickLinks: [
      { label: "Shop All", href: "/shop" },
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    supportLinks: [
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
} as const;

export type StoreConfig = typeof storeConfig;
