import { ChevronDown, KeyRound, LogOut, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function AccountMenu({
  name,
  subtitle,
  side = "bottom",
  align = "right",
  onChangePassword,
  onLogout,
}: {
  name?: string;
  subtitle?: string;
  /** куда раскрывать меню: вниз (по умолчанию) или вверх — для меню в подвале сайдбара */
  side?: "top" | "bottom";
  /** к какому краю кнопки прижать меню: справа (по умолчанию) или слева — чтобы в сайдбаре раскрывалось вправо */
  align?: "left" | "right";
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Аккаунт"
      >
        <UserCircle2 className="h-5 w-5" />
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-56 overflow-hidden rounded-md border bg-card shadow-lg",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {(name || subtitle) && (
            <div className="border-b px-3 py-2">
              {name && <div className="truncate text-sm font-medium">{name}</div>}
              {subtitle && (
                <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
          )}
          <button
            role="menuitem"
            onClick={() => run(onChangePassword)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" /> Сменить пароль
          </button>
          <button
            role="menuitem"
            onClick={() => run(onLogout)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      )}
    </div>
  );
}
