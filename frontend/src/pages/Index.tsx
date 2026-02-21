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
import { BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { KipLogo } from "@/components/ui/KipLogo";

const Index = () => {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { addTransaction, deleteTransaction } = useTransactions();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  const headerVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const mainVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="header-blur sticky top-0 z-50"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="container-app py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo & Date */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <KipLogo size="sm" showText={false} />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-display font-bold text-foreground truncate">
                  Minhas Finanças
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {today}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <Link to="/categories">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Categorias</span>
                </Button>
              </Link>
              <div className="w-px h-6 bg-border mx-2" />
              <TransactionForm onSubmit={addTransaction} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLogoutDialogOpen(true)}
                title="Sair"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <TransactionForm onSubmit={addTransaction} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="h-9 w-9"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden"
              >
                <nav className="flex flex-col gap-1 pt-4 pb-2 border-t border-border/50 mt-4">
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-11"
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span>Dashboard</span>
                    </Button>
                  </Link>
                  <Link to="/categories" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-11"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Categorias</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLogoutDialogOpen(true);
                    }}
                    className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </Button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-display">
              Deseja sair?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Você será redirecionado para a página de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel className="px-6">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-destructive hover:bg-destructive/90 px-6"
            >
              Sair
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <motion.main
        className="container-app py-6 sm:py-8 flex-1"
        variants={mainVariants}
        initial="hidden"
        animate="visible"
      >
        <PeriodTabs onDeleteTransaction={deleteTransaction} />
      </motion.main>

      {/* Footer */}
      <motion.footer
        className="border-t border-border/50 py-6 mt-auto backdrop-blur-sm bg-background/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="container-app text-center">
          <p className="text-sm text-muted-foreground">
            Organize suas finanças de forma simples e eficiente
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            © {new Date().getFullYear()} KIP • Seu organizador financeiro
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
