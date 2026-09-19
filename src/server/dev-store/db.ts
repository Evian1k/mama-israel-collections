import { storeConfig } from "@/config/store";
import type {
  Category,
  ContactMessage,
  NewsletterSubscriber,
  Order,
  Product,
  StoreSettings,
} from "@/types";

/**
 * ============================================================================
 * DEV DATABASE — IN-MEMORY DEVELOPMENT ADAPTER (Phase 1 only)
 * ============================================================================
 * A tiny single-process data store that lets the whole application run
 * end-to-end (shop → cart → checkout → order; admin CRUD) before the real
 * backend exists. It implements EXACTLY the contracts in src/types.
 *
 * Characteristics (deliberate, documented):
 * - Starts 100% EMPTY. No fake products, orders, customers or statistics.
 * - Data lives for the lifetime of the dev server process only.
 * - Phase 2 replaces this module with PostgreSQL + Prisma on the backend —
 *   no frontend changes required (NEXT_PUBLIC_API_URL swap).
 * ============================================================================
 */

export interface DevDatabase {
  categories: Category[];
  products: Product[];
  orders: Order[];
  newsletterSubscribers: NewsletterSubscriber[];
  contactMessages: ContactMessage[];
  settings: StoreSettings;
  seq: {
    category: number;
    product: number;
    order: number;
  };
}

export function createInitialSettings(): StoreSettings {
  return {
    name: storeConfig.name,
    shortName: storeConfig.shortName,
    tagline: storeConfig.tagline,
    description: storeConfig.description,
    email: storeConfig.contact.email,
    phone: storeConfig.contact.phone,
    whatsappNumber: storeConfig.contact.whatsappNumber,
    location: storeConfig.contact.location,
    socialLinks: {
      instagram: storeConfig.social.instagram,
      facebook: storeConfig.social.facebook,
      tiktok: storeConfig.social.tiktok,
      twitter: storeConfig.social.twitter,
    },
    currency: storeConfig.currency.code,
    currencySymbol: storeConfig.currency.symbol,
    currencyLocale: storeConfig.currency.locale,
    delivery: {
      flatFee: null,
      freeAboveThreshold: null,
      note: "Delivery fee is confirmed with you after the order is placed.",
    },
    payments: {
      payOnDeliveryEnabled: true,
      mpesa: {
        enabled: false,
        businessName: storeConfig.name,
        tillEnabled: false,
        tillNumber: "",
        paybillEnabled: false,
        paybillNumber: "",
        accountNumber: "",
        instructions: "",
      },
    },
    lowStockThreshold: 3,
    updatedAt: new Date().toISOString(),
  };
}

function createInitialDb(): DevDatabase {
  return {
    categories: [],
    products: [],
    orders: [],
    newsletterSubscribers: [],
    contactMessages: [],
    settings: createInitialSettings(),
    seq: { category: 0, product: 0, order: 0 },
  };
}

/** Persisted across HMR reloads via globalThis (dev-server lifetime) */
const globalStore = globalThis as unknown as { __mamaIsraelDevDb?: DevDatabase };

export function getDb(): DevDatabase {
  if (!globalStore.__mamaIsraelDevDb) {
    globalStore.__mamaIsraelDevDb = createInitialDb();
  }
  return globalStore.__mamaIsraelDevDb;
}

export function resetDb(): void {
  globalStore.__mamaIsraelDevDb = createInitialDb();
}
