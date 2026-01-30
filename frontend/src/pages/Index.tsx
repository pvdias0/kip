import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionForm } from "@/components/TransactionForm";
import { PeriodTabs } from "@/components/PeriodTabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wallet, BarChart3, Settings, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { addTransaction, deleteTransaction } = useTransactions();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg sm:rounded-xl bg-primary p-1.5 sm:p-2 flex-shrink-0">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                  Minhas Finanças
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {today}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" title="Dashboard" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="ghost" size="icon" title="Categorias" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div className="hidden xs:flex">
                <TransactionForm onSubmit={addTransaction} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLogoutDialogOpen(true)}
                title="Sair"
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
          {/* Mobile button - below header on small screens */}
          <div className="flex xs:hidden mt-3">
            <TransactionForm onSubmit={addTransaction} />
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será redirecionado para a página de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm}>
              Sair
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1">
        <PeriodTabs onDeleteTransaction={deleteTransaction} />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Organize suas finanças de forma simples e eficiente</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
