"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCart } from "@/features/cart/use-cart";
import { useCategories } from "@/hooks/use-categories";
import { useSecretTapNavigate } from "@/hooks/use-secret-tap-navigate";
import { storeConfig } from "@/config/store";
import { cn } from "@/lib/utils";

function SearchForm({
  className,
  onSubmitted,
  autoFocus = false,
}: {
  className?: string;
  onSubmitted?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const q = term.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
    onSubmitted?.();
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("flex w-full items-center gap-2", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <Input
        id="site-search"
        type="search"
        placeholder="Search dresses, tops, skirts…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="h-9 rounded-full border-input bg-background"
        autoFocus={autoFocus}
      />
      <Button type="submit" size="icon" variant="secondary" className="size-9 shrink-0 rounded-full" aria-label="Search">
        <Search className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}

function BrandMark({ className }: { className?: string }) {
  // Owner gesture: five rapid taps on the brand open the admin sign-in page.
  // Taps 1–4 navigate home as usual; only the fifth tap is intercepted.
  const onSecretTap = useSecretTapNavigate("/admin/login");

  return (
    <Link
      href="/"
      onClick={onSecretTap}
      className={cn("group flex flex-col leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm", className)}
      aria-label={`${storeConfig.name} — home`}
    >
      <span className="font-display text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
        {storeConfig.shortName}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
        {storeConfig.initials === "MI" ? "Collections" : ""}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const { data: categories } = useCategories();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "relative px-1 py-2 text-sm font-medium tracking-wide transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        isActive(href) ? "text-primary" : "text-foreground/80"
      )}
    >
      {label}
      <span
        className={cn(
          "absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-primary transition-transform duration-200",
          isActive(href) ? "scale-x-100" : "scale-x-0"
        )}
        aria-hidden="true"
      />
    </Link>
  );

  const categoryItems = (categories ?? []).filter((c) => c.isActive);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center gap-4">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-lg font-bold">{storeConfig.name}</SheetTitle>
              <SheetDescription className="text-xs uppercase tracking-[0.2em] text-gold">
                {storeConfig.tagline}
              </SheetDescription>
            </SheetHeader>
            <nav className="mt-2 flex flex-col gap-1 px-4" aria-label="Mobile">
              {storeConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-secondary text-primary"
                      : "text-foreground/85 hover:bg-secondary/70"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {categoryItems.length > 0 ? (
                <>
                  <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Categories
                  </p>
                  {categoryItems.map((category) => (
                    <Link
                      key={category.id}
                      href={`/shop/${category.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary/70"
                    >
                      {category.name}
                    </Link>
                  ))}
                </>
              ) : null}
            </nav>
            <div className="mt-4 px-4">
              <SearchForm autoFocus onSubmitted={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <BrandMark />

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Primary">
          {storeConfig.navigation.map((item) => navLink(item.href, item.label))}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-sm px-1 py-2 text-sm font-medium tracking-wide text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="inline-flex items-center gap-1">
                Categories
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Shop by category
              </DropdownMenuLabel>
              {categoryItems.length === 0 ? (
                <DropdownMenuItem disabled>No categories yet</DropdownMenuItem>
              ) : (
                categoryItems.map((category) => (
                  <DropdownMenuItem key={category.id} asChild>
                    <Link href={`/shop/${category.slug}`}>{category.name}</Link>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/shop">Browse everything</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden w-64 xl:block">
            <SearchForm />
          </div>

          <Button variant="ghost" size="icon" className="xl:hidden" asChild aria-label="Search products">
            <Link href="/shop" aria-label="Search products">
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart" aria-label={`Shopping bag${hydrated && count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}>
              <ShoppingBag className="size-5" aria-hidden="true" />
              {hydrated && count > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  aria-hidden="true"
                >
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
