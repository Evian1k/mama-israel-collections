"use client";

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ForcePasswordChange } from "@/components/admin/force-password-change";
import { useAdminAuth } from "@/features/admin/auth-store";
import { useAdminSession } from "@/hooks/admin/use-admin-stats";
import { adminAuthApi } from "@/services/api/admin/auth";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "AI Product Assistant", href: "/admin/ai-assistant", icon: Sparkles },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

function isActivePath(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Admin">
      {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
        const active = isActivePath(pathname, href, exact ?? false);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className={cn("size-4.5 shrink-0", active ? "text-gold" : "")} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="px-6 py-6">
      <p className="font-display text-lg font-bold text-sidebar-foreground">Mama Israel</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
        Collections
      </p>
      <p className="mt-3 inline-flex rounded-full border border-sidebar-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/70">
        Admin Panel
      </p>
    </div>
  );
}

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAdminAuth((s) => s.session?.user);
  const signOut = useAdminAuth((s) => s.signOut);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <SidebarBrand />
      <SidebarNav onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border px-3 py-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
            View store
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
          {user ? <span className="sr-only">({user.email})</span> : null}
        </Button>
      </div>
    </div>
  );
}

/**
 * Private admin shell:
 * - /admin/login renders standalone (no sidebar, no guard redirect loop).
 * - every other /admin/* route requires a session; unauthenticated visitors
 *   are redirected to /admin/login.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isAuthenticated, user } = useAdminSession();
  const signOut = useAdminAuth((s) => s.signOut);
  const setSession = useAdminAuth((s) => s.setSession);
  const mustChangePassword = useAdminAuth((s) => s.session?.mustChangePassword === true);
  const isLoginRoute = pathname === "/admin/login";

  /*
   * The admin session is persisted to localStorage; zustand rehydrates it
   * AFTER the first render. Gating the guards on hydration prevents a hard
   * refresh / deep link into any /admin/* route from bouncing to /admin/login
   * before the stored session has been read (same pattern as
   * features/cart/use-cart.ts — no setState-in-effect).
   */
  const subscribeAuthHydration = useCallback(
    (onStoreChange: () => void) => useAdminAuth.persist.onFinishHydration(onStoreChange),
    []
  );
  const getAuthHydrationSnapshot = useCallback(() => useAdminAuth.persist.hasHydrated(), []);
  const getAuthServerSnapshot = useCallback(() => false, []);
  const authHydrated = useSyncExternalStore(
    subscribeAuthHydration,
    getAuthHydrationSnapshot,
    getAuthServerSnapshot
  );

  useEffect(() => {
    if (!authHydrated) return;
    if (!isLoginRoute && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isLoginRoute, isAuthenticated, authHydrated, router]);

  useEffect(() => {
    if (!authHydrated) return;
    if (isLoginRoute && token) {
      // Already signed in — go straight to the dashboard.
      router.replace("/admin");
    }
  }, [isLoginRoute, token, authHydrated, router]);

  /*
   * Session flag refresh: legacy persisted sessions may predate the
   * mustChangePassword flag. Re-validating via the auth session endpoint and
   * adopting the refreshed session keeps the forced-change gate current
   * (the backend can also flip the flag server-side). Adopting only when
   * the value differs keeps this effect from looping.
   */
  const sessionCheck = useQuery({
    queryKey: queryKeys.admin.sessionCheck(token),
    queryFn: ({ signal }) => adminAuthApi.session(token!, signal),
    enabled: Boolean(token) && authHydrated && !isLoginRoute,
    staleTime: 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    const fresh = sessionCheck.data;
    if (!fresh) return;
    // Never adopt a cached session that belongs to a DIFFERENT account — e.g.
    // a stale cache entry right after change-credentials. (The /session
    // endpoint signs a fresh token on every call, so tokens can't be compared.)
    if (user && fresh.user.id !== user.id) return;
    if (fresh.mustChangePassword !== mustChangePassword) {
      setSession(fresh);
    }
  }, [sessionCheck.data, mustChangePassword, setSession, user]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground" role="status" aria-live="polite">
          <Store className="size-6 animate-pulse" aria-hidden="true" />
          <p className="text-sm">Checking your session…</p>
        </div>
      </div>
    );
  }

  /*
   * Onboarding gate: while the setup password is still in force the shell
   * renders ONLY the forced password change — no nav, no children — for
   * every admin route. It clears itself once a fresh session is stored.
   */
  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <AdminSidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <AdminSidebarContent />
            </SheetContent>
          </Sheet>

          <p className="text-sm font-medium text-muted-foreground">
            Store management
          </p>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground"
            >
              MI
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
