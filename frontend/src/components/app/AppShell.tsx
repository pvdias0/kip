import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/app/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
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
};

export function AppShell({
  title,
  subtitle,
  headerActions,
  children,
  insetClassName,
}: AppShellProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar onLogoutRequest={() => setIsLogoutDialogOpen(true)} />
      <SidebarInset
        className={cn(
          "bg-gradient-to-br from-background via-muted/35 to-background",
          insetClassName,
        )}
      >
        <motion.header
          className="header-blur sticky top-0 z-40 border-b border-border/40"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="container-app py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="h-10 w-10 rounded-xl border border-border/60 bg-background/80 shadow-sm hover:bg-accent/60" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-display font-bold text-foreground sm:text-xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              {headerActions ? (
                <div className="flex items-center gap-2">{headerActions}</div>
              ) : null}
            </div>
          </div>
        </motion.header>

        {children}

        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-display">
                Deseja sair?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Voce sera redirecionado para a pagina de login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3 pt-4">
              <AlertDialogCancel className="px-6">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogoutConfirm}
                className="bg-destructive px-6 hover:bg-destructive/90"
              >
                Sair
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
