export const API_BASE_URL = "http://localhost:3000";

export const API_ENDPOINTS = {
  health: "/health",
  products: (storeId: number) => `/stores/${storeId}/products`,
} as const;

export type HealthResponse = {
  status: "ok";
  database: "ok";
};

export type ProductStatus = "ACTIVE" | "ARCHIVED";

/** JSON shape returned by GET /stores/:storeId/products. */
export type Product = {
  id: number;
  storeId: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string | null;
  status: ProductStatus;
};

export type StorePreview = {
  name: "Fresh Bakery" | "Fresh Clothing";
  slug: "fresh-bakery" | "fresh-clothing";
  id: number;
};

/** Store IDs are database-generated after seeding. */
export const SEEDED_STORES = {
  bakerySlug: "fresh-bakery",
  clothingSlug: "fresh-clothing",
} as const;
