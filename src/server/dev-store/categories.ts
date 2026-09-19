import { ApiError } from "@/services/api/client";
import { getDb } from "./db";
import { generateId, slugify, uniqueSlug } from "./ids";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types";

/** Category repository for the dev adapter */

function withCount(category: Category): Category {
  const db = getDb();
  return {
    ...category,
    productCount: db.products.filter(
      (p) => p.categoryId === category.id && p.isActive
    ).length,
  };
}

export function listCategories(includeInactive = false): Category[] {
  const db = getDb();
  return db.categories
    .filter((c) => includeInactive || c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(withCount);
}

export function listAllCategoriesAdmin(): Category[] {
  return listCategories(true);
}

export function createCategory(input: CreateCategoryInput): Category {
  const db = getDb();
  const taken = new Set(db.categories.map((c) => c.slug));
  const slug = input.slug ? uniqueSlug(input.slug, taken) : uniqueSlug(input.name, taken);
  const now = new Date().toISOString();

  const category: Category = {
    id: generateId("cat"),
    name: input.name,
    slug,
    description: input.description ?? "",
    imageUrl: input.imageUrl ?? null,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? db.categories.length,
    createdAt: now,
    updatedAt: now,
  };

  db.categories.push(category);
  return withCount(category);
}

export function updateCategory(id: string, input: UpdateCategoryInput): Category {
  const db = getDb();
  const category = db.categories.find((c) => c.id === id);
  if (!category) {
    throw new ApiError("Category not found.", 404, "NOT_FOUND");
  }

  if (input.slug && input.slug !== category.slug) {
    const taken = new Set(db.categories.filter((c) => c.id !== id).map((c) => c.slug));
    category.slug = uniqueSlug(input.slug, taken);
  }

  if (input.name !== undefined) category.name = input.name;
  if (input.description !== undefined) category.description = input.description;
  if (input.imageUrl !== undefined) category.imageUrl = input.imageUrl;
  if (input.isActive !== undefined) category.isActive = input.isActive;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
  category.updatedAt = new Date().toISOString();

  return withCount(category);
}

/**
 * Deleting a category that still has products is blocked — the owner must
 * reassign or delete products first (prevents orphaned catalogue entries).
 */
export function deleteCategory(id: string): void {
  const db = getDb();
  const category = db.categories.find((c) => c.id === id);
  if (!category) {
    throw new ApiError("Category not found.", 404, "NOT_FOUND");
  }
  const productCount = db.products.filter((p) => p.categoryId === id).length;
  if (productCount > 0) {
    throw new ApiError(
      `This category still has ${productCount} product${productCount === 1 ? "" : "s"}. Move or delete them first.`,
      409,
      "CONFLICT"
    );
  }
  db.categories = db.categories.filter((c) => c.id !== id);
}

export { slugify };
