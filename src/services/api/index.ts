/**
 * API service layer barrel — the ONLY way UI code talks to the backend.
 * See services/api/client.ts for the transport (NEXT_PUBLIC_API_URL aware).
 */
export { ApiError, apiRequest, getApiBaseUrl, buildQueryString } from "./client";
export { productsApi } from "./products";
export { categoriesApi } from "./categories";
export { storeApi } from "./store";
export { ordersApi } from "./orders";
export { paymentsApi } from "./payments";
export { engagementApi } from "./engagement";
export { adminAuthApi } from "./admin/auth";
export { adminProductsApi } from "./admin/products";
export { adminOrdersApi, type AdminOrderQuery } from "./admin/orders";
export { adminCustomersApi } from "./admin/customers";
export { adminCategoriesApi } from "./admin/categories";
export { adminSettingsApi } from "./admin/settings";
export { adminStatsApi } from "./admin/stats";
export { adminDevDataApi } from "./admin/dev-data";
