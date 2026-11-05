import { Link, useLocation } from "react-router-dom";
import { Home, Menu, Plus, ReceiptText, Wallet } from "lucide-react";

import { useEntrySheet } from "@/components/entry/EntrySheetProvider";
import { cn } from "@/lib/utils";

const items = [
  { label: "Início", href: "/", icon: Home, match: (p: string) => p === "/" },
  { label: "Extrato", href: "/extrato", icon: ReceiptText, match: (p: string) => p.startsWith("/extrato") },
  null,
  { label: "Carteira", href: "/carteira", icon: Wallet, match: (p: string) => p.startsWith("/carteira") },
  {
    label: "Mais",
    href: "/mais",
    icon: Menu,
    match: (p: string) => ["/mais", "/relatorios", "/categories", "/payment-methods", "/whatsapp", "/profile"].some((x) => p.startsWith(x)),
  },
];

/** Navegacao do celular: sempre a um toque, com o "+" no centro. */
export function BottomNav() {
  const { pathname } = useLocation();
  const { openNew } = useEntrySheet();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
        {items.map((item) =>
          item ? (
            <li key={item.href}>
              <Link
                to={item.href}
                aria-current={item.match(pathname) ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  item.match(pathname) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          ) : (
            <li key="add" className="flex justify-center">
              <button
                type="button"
                onClick={() => openNew()}
                aria-label="Novo lançamento"
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              >
                <Plus className="h-7 w-7" />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
