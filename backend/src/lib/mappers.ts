import type {
  Prisma,
  Product as DbProduct,
  ProductImage as DbProductImage,
  Category as DbCategory,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  OrderStatusEvent as DbOrderStatusEvent,
  Payment as DbPayment,
  PaymentTransaction as DbPaymentTransaction,
  Customer as DbCustomer,
  StoreSettings as DbStoreSettings,
} from "@prisma/client";
import type {
  Category,
  CustomerDetail,
  CustomerSummary,
  Order,
  OrderItem,
  OrderStatusEvent,
  Product,
  ProductColor,
  ProductImage,
  StoreDeliverySettings,
  StoreDeliveryZone,
  StorePaymentsSettings,
  StoreSettings,
  StoreSocialLinks,
} from "../shared/api-types";

/**
 * ============================================================================
 * MAPPERS — database rows → exact frontend API contract shapes (src/types/*)
 * ============================================================================
 * These are the ONLY place where DB rows are converted to API payloads, so the
 * frozen frontend contracts never drift.
 * ============================================================================
 */

type ProductWithRelations = DbProduct & {
  images: DbProductImage[];
  category?: DbCategory | null;
};

export function mapProductImage(image: DbProductImage): ProductImage {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

/** Primary first, then sort order — mirrors src/lib/product-utils.ts */
export function sortImages(images: DbProductImage[]): DbProductImage[] {
  return [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export function primaryImageUrl(images: DbProductImage[]): string | null {
  const sorted = sortImages(images);
  return sorted[0]?.url ?? null;
}

export function mapProduct(product: ProductWithRelations): Product {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category ? mapCategory(product.category) : null,
    price: Number(product.price),
    compareAtPrice:
      product.compareAtPrice === null ? null : Number(product.compareAtPrice),
    sku: product.sku,
    images: sortImages(product.images).map(mapProductImage),
    sizes: [...product.sizes],
    colors: Array.isArray(product.colors) ? (product.colors as unknown as ProductColor[]) : [],
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function mapCategory(category: DbCategory, productCount?: number): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    productCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function mapOrderItem(item: DbOrderItem): OrderItem {
  return {
    id: item.id,
    productId: item.productId ?? "",
    productName: item.productName,
    productSlug: item.productSlug,
    imageUrl: item.imageUrl,
    size: item.size,
    color: item.color,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    lineTotal: Number(item.lineTotal),
  };
}

export function mapOrderStatusEvent(event: DbOrderStatusEvent): OrderStatusEvent {
  return {
    status: event.newStatus,
    at: event.createdAt.toISOString(),
    ...(event.note ? { note: event.note } : {}),
  };
}

type OrderWithRelations = DbOrder & {
  items: DbOrderItem[];
  statusHistory: DbOrderStatusEvent[];
  payments: (DbPayment & { transactions: DbPaymentTransaction[] })[];
};

/**
 * The M-Pesa transaction code shown on orders = the receipt of the LATEST
 * mpesa Payment's latest transaction (null when the order is not mpesa or no
 * receipt was recorded yet).
 */
export function latestMpesaReceipt(payments: OrderWithRelations["payments"]): string | null {
  const payment = [...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .find((p) => p.provider === "mpesa");
  if (!payment) return null;
  const transaction = [...payment.transactions].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
  return transaction?.receipt ?? null;
}

export function mapOrder(order: OrderWithRelations): Order {
  const customer = {
    fullName: order.fullName,
    phone: order.phone,
    ...(order.email ? { email: order.email } : {}),
    deliveryLocation: order.deliveryLocation,
    ...(order.notes ? { notes: order.notes } : {}),
  };

  const mpesaTransactionCode = latestMpesaReceipt(order.payments);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customer,
    items: order.items.map(mapOrderItem),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    statusHistory: [...order.statusHistory]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapOrderStatusEvent),
    mpesaTransactionCode,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ------------------------------ Customers ----------------------------------

export type CustomerWithOrders = DbCustomer & {
  orders: DbOrder[];
};

export function mapCustomerSummary(customer: CustomerWithOrders): CustomerSummary {
  const live = customer.orders.filter((o) => o.status !== "cancelled");
  const sorted = [...live].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpent = live.reduce((sum, o) => sum + Number(o.total), 0);
  const deliveryLocations = [...new Set(live.map((o) => o.deliveryLocation))];

  return {
    id: customer.id,
    fullName: last ? last.fullName : customer.fullName,
    phone: customer.phone,
    ...(customer.email ? { email: customer.email } : {}),
    ordersCount: live.length,
    totalSpent,
    ...(first ? { firstOrderAt: first.createdAt.toISOString() } : {}),
    ...(last ? { lastOrderAt: last.createdAt.toISOString() } : {}),
    deliveryLocations,
  };
}

export function mapCustomerDetail(customer: CustomerWithOrders): CustomerDetail {
  const sorted = [...customer.orders].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  return {
    ...mapCustomerSummary(customer),
    orders: sorted.map((order) =>
      mapOrder(order as OrderWithRelations)
    ),
  };
}

// ------------------------------ Store settings -----------------------------

export const DEFAULT_SOCIAL_LINKS: StoreSocialLinks = {
  instagram: "",
  facebook: "",
  tiktok: "",
  twitter: "",
};

export const DEFAULT_DELIVERY: StoreDeliverySettings = {
  flatFee: null,
  freeAboveThreshold: null,
  note: "",
  zones: [],
};

export const DEFAULT_PAYMENTS: StorePaymentsSettings = {
  payOnDeliveryEnabled: true,
  mpesa: {
    enabled: false,
    businessName: "",
    tillEnabled: false,
    tillNumber: "",
    paybillEnabled: false,
    paybillNumber: "",
    accountNumber: "",
    instructions: "",
  },
};

/**
 * Coerce a stored/unknown payments value into a valid StorePaymentsSettings —
 * invalid/absent parts fall back to the defaults (never trust legacy or
 * hand-edited JSON).
 */
export function normalisePayments(raw: unknown): StorePaymentsSettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PAYMENTS };
  const stored = raw as Record<string, unknown>;
  const storedMpesa =
    typeof stored.mpesa === "object" && stored.mpesa !== null
      ? (stored.mpesa as Record<string, unknown>)
      : {};
  const str = (value: unknown, max: number): string =>
    typeof value === "string" ? value.slice(0, max) : "";
  const bool = (value: unknown): boolean => value === true;
  return {
    payOnDeliveryEnabled: stored.payOnDeliveryEnabled === undefined ? true : bool(stored.payOnDeliveryEnabled),
    mpesa: {
      enabled: bool(storedMpesa.enabled),
      businessName: str(storedMpesa.businessName, 120),
      tillEnabled: bool(storedMpesa.tillEnabled),
      tillNumber: str(storedMpesa.tillNumber, 12),
      paybillEnabled: bool(storedMpesa.paybillEnabled),
      paybillNumber: str(storedMpesa.paybillNumber, 12),
      accountNumber: str(storedMpesa.accountNumber, 120),
      instructions: str(storedMpesa.instructions, 1000),
    },
  };
}

/**
 * Coerce a stored/unknown zones value into valid StoreDeliveryZone[] —
 * invalid entries are dropped (never trust legacy or hand-edited JSON).
 */
export function normaliseZones(raw: unknown): StoreDeliveryZone[] {
  if (!Array.isArray(raw)) return [];
  const zones: StoreDeliveryZone[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { id, name, fee } = entry as Record<string, unknown>;
    if (typeof id !== "string" || id.trim() === "") continue;
    if (typeof name !== "string" || name.trim() === "") continue;
    const numericFee = typeof fee === "number" ? fee : Number(fee);
    if (!Number.isFinite(numericFee) || numericFee < 0) continue;
    zones.push({ id: id.trim().slice(0, 40), name: name.trim().slice(0, 60), fee: numericFee });
  }
  return zones.slice(0, 20);
}

export function mapStoreSettings(settings: DbStoreSettings): StoreSettings {
  const storedDelivery = { ...DEFAULT_DELIVERY, ...(settings.delivery as object) };
  return {
    name: settings.name,
    shortName: settings.shortName,
    tagline: settings.tagline,
    description: settings.description,
    email: settings.email,
    phone: settings.phone,
    whatsappNumber: settings.whatsappNumber,
    logoUrl: settings.logoUrl ?? null,
    location: settings.location,
    socialLinks: { ...DEFAULT_SOCIAL_LINKS, ...(settings.socialLinks as object) },
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    currencyLocale: settings.currencyLocale,
    delivery: { ...storedDelivery, zones: normaliseZones(storedDelivery.zones) },
    payments: normalisePayments(settings.payments),
    lowStockThreshold: settings.lowStockThreshold,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

// ------------------------------ Pagination ---------------------------------

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

export function paginated<T>(items: T[], page: number, limit: number, total: number): Paginated<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

export type DbTx = Prisma.TransactionClient;
