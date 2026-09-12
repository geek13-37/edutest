import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { AccountMenu } from "@/components/ui/account-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ChangePasswordDialog } from "@/features/account/ChangePasswordDialog";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export interface NavEntry {
  to: string;
  label: string;
  end?: boolean;
}

function NavList({ nav, onNavigate }: { nav: NavEntry[]; onNavigate?: () => void }) {
  return (
    <>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function ShellLayout({
  nav,
  brandTo,
  brandIcon,
  brandSuffix,
  accountSubtitle,
}: {
  nav: NavEntry[];
  brandTo: string;
  brandIcon: ReactNode;
  brandSuffix?: string;
  accountSubtitle?: string;
}) {
  const { user, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const brand = (
    <Link to={brandTo} className="flex shrink-0 items-center gap-2 font-semibold">
      {brandIcon}
      <span>Edutest</span>
      {brandSuffix && <span className="text-muted-foreground">{brandSuffix}</span>}
    </Link>
  );

  const account = (side: "top" | "bottom", align: "left" | "right") => (
    <>
      <ThemeToggle />
      <AccountMenu
        name={user?.full_name}
        subtitle={accountSubtitle}
        side={side}
        align={align}
        onChangePassword={() => setPwOpen(true)}
        onLogout={logout}
      />
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Боковое меню, md и шире */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-4">{brand}</div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavList nav={nav} />
        </nav>
        <div className="flex items-center gap-2 border-t p-3">{account("top", "left")}</div>
      </aside>

      {/* Верхняя панель с бургером, мобилка */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-card px-3 md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          {brand}
        </div>
        <div className="flex items-center gap-1">{account("bottom", "right")}</div>
      </header>

      {/* Выдвижное меню, мобилка */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              {brand}
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <NavList nav={nav} onNavigate={() => setDrawer(false)} />
            </nav>
          </div>
        </div>
      )}

      <main className="md:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
