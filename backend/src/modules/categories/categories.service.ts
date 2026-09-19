import { prisma } from "../../lib/prisma";
import { mapCategory } from "../../lib/mappers";
import { ApiError } from "../../lib/errors";
import { slugify, uniqueSlug } from "../../lib/slugs";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "../../shared/api-types";

/**
 * Category service — create/update/delete with unique slugs.
 * Deleting a category that still has products is blocked (409 CONFLICT) so the
 * catalogue can never contain orphaned products.
 */

const slugTaken = (candidate: string) =>
  prisma.category.findUnique({ where: { slug: candidate } }).then(Boolean);

async function categorySlugTakenExcluding(candidate: string, id: string): Promise<boolean> {
  const found = await prisma.category.findUnique({ where: { slug: candidate } });
  return Boolean(found && found.id !== id);
}

export async function listCategories(includeInactive: boolean): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.map((c) => mapCategory(c, c._count.products));
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const slug = await uniqueSlug(input.slug ?? input.name, slugTaken);
  const count = await prisma.category.count();
  const created = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? "",
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? count,
    },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return mapCategory(created, created._count.products);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Category not found.");

  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    slug = await uniqueSlug(input.slug, (c) => categorySlugTakenExcluding(c, id));
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return mapCategory(updated, updated._count.products);
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw ApiError.notFound("Category not found.");

  if (existing._count.products > 0) {
    throw ApiError.conflict(
      `This category still has ${existing._count.products} product${existing._count.products === 1 ? "" : "s"}. Move or delete them first.`
    );
  }

  await prisma.category.delete({ where: { id } });
}

export { slugify };
