"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminCategories, useAdminCategoryMutations } from "@/hooks/admin/use-admin-data";
import { ApiError } from "@/services/api/client";
import { formatDate, formatNumber } from "@/lib/format";
import type { Category } from "@/types";

import { CategoryDialogForm } from "./category-dialog-form";

type DialogState = { mode: "create" } | { mode: "edit"; category: Category } | null;

export function AdminCategoriesView() {
  const categoriesQuery = useAdminCategories();
  const { remove } = useAdminCategoryMutations();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = categoriesQuery.data ?? [];

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        // 409 CONFLICT: category still has products — surface the server's guidance
        const message =
          error instanceof ApiError && error.message
            ? error.message
            : "We could not delete this category. Please try again.";
        toast.error(message);
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organise your catalogue into collections shoppers can browse."
        actions={
          <Button className="rounded-full" onClick={() => setDialog({ mode: "create" })}>
            <Plus className="size-4" aria-hidden="true" />
            New category
          </Button>
        }
      />

      {categoriesQuery.isPending ? (
        <TableSkeleton rows={5} />
      ) : categoriesQuery.isError ? (
        <ErrorState
          title="We could not load your categories"
          message="Something went wrong while fetching categories. Please try again."
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Categories group your pieces into collections — like Dresses, Tops or Two-Piece Sets. Create your first one to start adding products."
          action={
            <Button className="rounded-full" onClick={() => setDialog({ mode: "create" })}>
              <Plus className="size-4" aria-hidden="true" />
              New category
            </Button>
          }
        />
      ) : (
        <>
          {/* ------------------------------- table (md+) ------------------------------ */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead>Category</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Sort order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        /shop/{category.slug}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="tabular-nums">
                        {formatNumber(category.productCount ?? 0)}{" "}
                        {(category.productCount ?? 0) === 1 ? "product" : "products"}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {formatNumber(category.sortOrder)}
                    </TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-900"
                        >
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1.5 border-border bg-secondary/60 text-muted-foreground"
                        >
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-stone-400" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(category.createdAt)}
                    </TableCell>
                    <TableCell>
                      <CategoryRowActions
                        category={category}
                        onEdit={() => setDialog({ mode: "edit", category })}
                        onDelete={() => setDeleteTarget(category)}
                        deletePending={remove.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------------ cards (mobile) ---------------------------- */}
          <ul className="space-y-3 md:hidden">
            {categories.map((category) => (
              <li key={category.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{category.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      /shop/{category.slug}
                    </p>
                  </div>
                  <CategoryRowActions
                    category={category}
                    onEdit={() => setDialog({ mode: "edit", category })}
                    onDelete={() => setDeleteTarget(category)}
                    deletePending={remove.isPending}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <Badge variant="secondary" className="tabular-nums">
                    {formatNumber(category.productCount ?? 0)}{" "}
                    {(category.productCount ?? 0) === 1 ? "product" : "products"}
                  </Badge>
                  <Badge variant="outline" className="tabular-nums text-muted-foreground">
                    #{formatNumber(category.sortOrder)}
                  </Badge>
                  {category.isActive ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-900"
                    >
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-border bg-secondary/60 text-muted-foreground"
                    >
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-stone-400" />
                      Inactive
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(category.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-muted-foreground">
            {categories.length} {categories.length === 1 ? "category" : "categories"} ·{" "}
            <Link
              href="/admin/products"
              className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Manage products
            </Link>
          </p>
        </>
      )}

      {/* ----------------------------- create / edit ------------------------------ */}
      <Dialog open={dialog !== null} onOpenChange={(open) => (!open ? setDialog(null) : null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              {dialog?.mode === "edit"
                ? "Update this collection — changes appear in the store immediately."
                : "Group related pieces together, e.g. Dresses or Two-Piece Sets."}
            </DialogDescription>
          </DialogHeader>
          {dialog ? (
            <CategoryDialogForm
              key={dialog.mode === "edit" ? dialog.category.id : "create"}
              mode={dialog.mode}
              initial={dialog.mode === "edit" ? dialog.category : null}
              onFinished={() => setDialog(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ------------------------------ delete dialog ----------------------------- */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (deleteTarget.productCount ?? 0) > 0
                ? `This category still has ${deleteTarget.productCount} ${
                    (deleteTarget.productCount ?? 0) === 1 ? "product" : "products"
                  }. Move or delete them first — then you can remove this category.`
                : "This removes the collection from your store. Products are not deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryRowActions({
  category,
  onEdit,
  onDelete,
  deletePending,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${category.name}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={deletePending}
          onSelect={onDelete}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
