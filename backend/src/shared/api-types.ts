/**
 * ============================================================================
 * SHARED API TYPES — byte-for-byte mirror of the frontend contracts
 * (src/types/* in the Next.js app). The backend must NEVER drift from these.
 * If a type changes in the frontend, change it here in the same commit.
 * ============================================================================
 */

// ------------------------------ api.ts -------------------------------------

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorPayload };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ------------------------------ category.ts --------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ------------------------------ product.ts ---------------------------------

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category?: Category | null;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  images: ProductImage[];
  sizes: string[];
  colors: ProductColor[];
  stockQuantity: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string;
  images?: Array<Omit<ProductImage, "id">>;
  sizes?: string[];
  colors?: ProductColor[];
  stockQuantity: number;
  lowStockThreshold?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
  /** Optional per size/colour stock (Phase 2 extension — additive) */
  variants?: ProductVariantInput[];
}

export interface ProductVariantInput {
  size?: string | null;
  color?: string | null;
  stock: number;
  sku?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc" | "featured";

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  sort?: ProductSort;
  featured?: boolean;
  newArrival?: boolean;
  inStock?: boolean;
  includeInactive?: boolean;
}

// ------------------------------ order.ts -----------------------------------

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["pay_on_delivery", "mpesa", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderCustomerInfo {
  fullName: string;
  phone: string;
  email?: string;
  deliveryLocation: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomerInfo;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  /** Manual M-Pesa flow: receipt code the customer submitted (null when none). */
  mpesaTransactionCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceOrderItemInput {
  productId: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

export interface PlaceOrderInput {
  items: PlaceOrderItemInput[];
  customer: OrderCustomerInfo;
  paymentMethod?: PaymentMethod;
  /** Manual M-Pesa flow — required when paymentMethod is "mpesa". */
  mpesaTransactionCode?: string;
}

// ------------------------------ customer.ts --------------------------------

export interface CustomerSummary {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  ordersCount: number;
  totalSpent: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  deliveryLocations: string[];
}

export interface CustomerDetail extends CustomerSummary {
  orders: Order[];
}

// ------------------------------ store.ts -----------------------------------

export interface StoreDeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export interface StoreDeliverySettings {
  flatFee: number | null;
  freeAboveThreshold: number | null;
  note: string;
  /** Named delivery zones — matched server-side against the checkout location. */
  zones: StoreDeliveryZone[];
}

export interface StoreSocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  twitter: string;
}

/**
 * Owner-configured payment options (admin settings only — never exposed on the
 * public store response). The customer pays DIRECTLY to the owner's M-Pesa
 * Till/Paybill and submits the transaction code; the owner verifies manually.
 * The website never holds money and no gateway/escrow is involved.
 */
export interface StorePaymentsSettings {
  payOnDeliveryEnabled: boolean;
  mpesa: {
    enabled: boolean; // master switch: show "Pay with M-Pesa" at checkout
    businessName: string; // e.g. "Mama Israel Collections"
    tillEnabled: boolean; // [ ] M-Pesa Till
    tillNumber: string; // digits only, e.g. "123456"
    paybillEnabled: boolean; // [ ] M-Pesa Paybill
    paybillNumber: string; // digits only, e.g. "555666"
    accountNumber: string; // account number/name used with Paybill
    instructions: string; // owner's custom payment instructions shown at checkout
  };
}

export interface StoreSettings {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  logoUrl: string | null;
  location: string;
  socialLinks: StoreSocialLinks;
  currency: string;
  currencySymbol: string;
  currencyLocale: string;
  delivery: StoreDeliverySettings;
  /** Admin-only payment configuration — stripped from the public store response. */
  payments?: StorePaymentsSettings;
  lowStockThreshold: number;
  updatedAt: string;
}

// ------------------------------ admin.ts -----------------------------------

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
}

export interface AdminSession {
  token: string;
  user: AdminUser;
  /** Onboarding: true until the bootstrap password has been changed. */
  mustChangePassword: boolean;
}

export interface OrderStatusCounts {
  pending: number;
  confirmed: number;
  processing: number;
  ready: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface DashboardStats {
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    byStatus: OrderStatusCounts;
    revenue: number;
  };
  customers: {
    total: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
  categories: {
    total: number;
  };
}

export interface OrdersByDayPoint {
  date: string;
  orderCount: number;
  revenue: number;
}

export interface CategoryProductCount {
  categoryId: string;
  categoryName: string;
  productCount: number;
  inStockCount: number;
}

export interface AnalyticsData {
  ordersByDay: OrdersByDayPoint[];
  topCategories: CategoryProductCount[];
  averageOrderValue: number;
  fulfilmentRate: number;
  cancellationRate: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
  }>;
}
