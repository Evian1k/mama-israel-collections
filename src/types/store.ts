export interface StoreDeliveryZone {
  /** Stable identifier kept across edits (survives name/fee changes) */
  id: string;
  /** Zone name as the customer types it, e.g. "Nairobi Westlands" */
  name: string;
  /** Delivery fee in KES for this zone; 0 = free (e.g. pick-up) */
  fee: number;
}

export interface StoreDeliverySettings {
  /** Flat delivery fee in KES; null = "to be confirmed" */
  flatFee: number | null;
  /** Orders above this qualify for free delivery; null = disabled */
  freeAboveThreshold: number | null;
  /** Free-text note shown at checkout, e.g. rural areas surcharge */
  note: string;
  /**
   * Named delivery zones with their own fees. The server matches the
   * customer's delivery location against these by normalised name
   * (trim/lowercase/collapse-spaces) — a zone match wins over the flat fee.
   * Always present from the Phase 2 backend; optional for the legacy dev
   * adapter, so every consumer treats it as a possibly-empty list.
   */
  zones?: StoreDeliveryZone[];
}

export interface StoreSocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  twitter: string;
}

/**
 * Owner-configured payment options (Admin → Settings → Payments).
 * Present in ADMIN settings responses; the PUBLIC GET /api/store response
 * never includes it — customers discover availability via
 * GET /api/payments/methods instead. Always treat as optional.
 */
export interface StorePaymentsSettings {
  payOnDeliveryEnabled: boolean;
  mpesa: {
    enabled: boolean;
    /** Business name shown on the checkout instructions card */
    businessName: string;
    tillEnabled: boolean;
    tillNumber: string;
    paybillEnabled: boolean;
    paybillNumber: string;
    accountNumber: string;
    /** Owner's custom instructions; empty = generated steps are shown */
    instructions: string;
  };
}

/**
 * Store settings — the business profile. In Phase 1 this is served by the dev
 * adapter (initialised from src/config/store.ts and editable in
 * Admin → Settings). In Phase 2 it lives in the database.
 */
export interface StoreSettings {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  /** WhatsApp number in international digits, e.g. "254712345678" */
  whatsappNumber: string;
  /** Store logo image URL (same-origin upload path or external); null = none.
   * Always present from the Phase 2 backend; optional for the legacy dev adapter. */
  logoUrl?: string | null;
  location: string;
  socialLinks: StoreSocialLinks;
  currency: string;
  currencySymbol: string;
  currencyLocale: string;
  delivery: StoreDeliverySettings;
  /**
   * Owner-configured payment options. ADMIN settings responses only — the
   * public storefront payload never includes this field (customers use
   * GET /api/payments/methods). Optional: legacy payloads may omit it.
   */
  payments?: StorePaymentsSettings;
  lowStockThreshold: number;
  updatedAt: string;
}
