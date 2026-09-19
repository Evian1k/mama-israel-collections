export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Computed by the API: number of active products in the category */
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
