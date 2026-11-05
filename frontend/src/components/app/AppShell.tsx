import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/app/AppSidebar";
import { BottomNav } from "@/components/app/BottomNav";
import { useEntrySheet } from "@/components/entry/EntrySheetProvider";
import { useRealtimeSync } from "@/hooks/useFinanceData";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  insetClassName?: string;
  /** Esconde o botao "Novo lancamento" do cabecalho (ex.: telas de configuracao). */
  hideNewEntry?: boolean;
};

const LOGOUT_EVENT = "kip:logout-request";

/** Abre a confirmacao de saida de qualquer lugar (ex.: tela "Mais" no celular). */
export function requestLogout() {
  window.dispatchEvent(new Event(LOGOUT_EVENT));
}

// sidebar aberta so em telas largas; no tablet comeca recolhida (so icones)
const sidebarStartsOpen = typeof window === "undefined" || window.innerWidth >= 1280;

export function AppShell({ title, subtitle, headerActions, children, insetClassName, hideNewEntry }: AppShellProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { openNew } = useEntrySheet();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  useRealtimeSync();

  useEffect(() => {
    const open = () => setIsLogoutDialogOpen(true);
    window.addEventListener(LOGOUT_EVENT, open);
    return () => window.removeEventListener(LOGOUT_EVENT, open);
  }, []);

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen={sidebarStartsOpen}>
      <AppSidebar onLogoutRequest={() => setIsLogoutDialogOpen(true)} />
      <SidebarInset className={cn("bg-background", insetClassName)}>
        <header className="header-blur sticky top-0 z-30 border-b border-border/40">
          <div className="container-app flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="hidden h-10 w-10 rounded-xl border border-border/60 bg-background/80 md:inline-flex" />
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-bold text-foreground sm:text-xl">{title}</h1>
                {subtitle ? <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {!hideNewEntry ? (
                <Button onClick={() => openNew()} className="hidden gap-2 font-semibold md:inline-flex">
                  <Plus className="h-4 w-4" />
                  Novo lançamento
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col pb-24 md:pb-0">{children}</div>

        <BottomNav />

        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <AlertDialogContent className="w-[92vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl">Sair do KIP?</AlertDialogTitle>
              <AlertDialogDescription>Você vai voltar para a tela de login.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogoutConfirm} className="bg-destructive hover:bg-destructive/90">
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
