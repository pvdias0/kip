import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionStats } from "@/hooks/useTransactionStats";
import { useAuth } from "@/contexts/AuthContext";
import { MonthNavigator } from "@/components/MonthNavigator";
import { RankingList } from "@/components/RankingList";
import { CategoryChart } from "@/components/CategoryChart";
import { SummaryCard } from "@/components/SummaryCard";
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
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addMonths, subMonths, isSameMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { KipLogo } from "@/components/ui/KipLogo";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { transactions } = useTransactions();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const stats = useTransactionStats(transactions, selectedMonth);

  const now = new Date();
  const canGoNext = !isSameMonth(selectedMonth, now);

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setSelectedMonth(addMonths(selectedMonth, 1));
    }
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutDialogOpen(false);
    navigate("/login");
  };

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
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
            {/* Logo & Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link to="/" className="flex-shrink-0">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-display font-bold text-foreground truncate">
                    Dashboard
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    Analytics
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {today}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Transações</span>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLogoutDialogOpen(true)}
                title="Sair"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
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
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-11"
                    >
                      <Wallet className="h-5 w-5" />
                      <span>Transações</span>
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
        className="container-app py-6 sm:py-8 space-y-8 flex-1"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Month Navigator */}
        <motion.div variants={itemVariants}>
          <MonthNavigator
            currentDate={selectedMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            canGoNext={canGoNext}
          />
        </motion.div>

        {/* Summary Cards */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Resumo do Mês
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <SummaryCard
              title="Total de Ganhos"
              value={stats.totalIncome}
              icon={TrendingUp}
              variant="income"
            />
            <SummaryCard
              title="Total de Gastos"
              value={stats.totalExpense}
              icon={TrendingDown}
              variant="expense"
            />
            <SummaryCard
              title="Saldo do Mês"
              value={stats.balance}
              icon={Wallet}
            />
          </div>
        </motion.section>

        {/* Charts Section */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Distribuição por Categoria
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart
              data={stats.incomeCategoryData}
              title="De onde vêm os Ganhos"
              type="income"
              emptyMessage="Nenhum ganho registrado"
            />
            <CategoryChart
              data={stats.expenseCategoryData}
              title="Para onde vão os Gastos"
              type="expense"
              emptyMessage="Nenhum gasto registrado"
            />
          </div>
        </motion.section>

        {/* Rankings Section */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Top Transações
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingList
              transactions={stats.topIncomes}
              title="Top 5 Maiores Ganhos"
              type="income"
              emptyMessage="Nenhum ganho registrado"
            />
            <RankingList
              transactions={stats.topExpenses}
              title="Top 5 Maiores Gastos"
              type="expense"
              emptyMessage="Nenhum gasto registrado"
            />
          </div>
        </motion.section>
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
            Visualize suas finanças de forma clara e objetiva
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            © {new Date().getFullYear()} KIP • Seu organizador financeiro
          </p>
        </div>
      </motion.footer>
    </div>
  );
};

export default Dashboard;
