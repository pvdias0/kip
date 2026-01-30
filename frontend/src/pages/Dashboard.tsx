import { useState, useEffect } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionStats } from "@/hooks/useTransactionStats";
import { useAuth } from "@/contexts/AuthContext";
import { MonthNavigator } from "@/components/MonthNavigator";
import { RankingList } from "@/components/RankingList";
import { CategoryChart } from "@/components/CategoryChart";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addMonths, subMonths, isSameMonth } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="rounded-lg sm:rounded-xl bg-primary p-1.5 sm:p-2 flex-shrink-0">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {today}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              <Link to="/">
                <Button variant="ghost" size="icon" title="Voltar" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="ghost" size="icon" title="Categorias" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1">
        <MonthNavigator
          currentDate={selectedMonth}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          canGoNext={canGoNext}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

        {/* Rankings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
      </main>

      {/* Footer */}
      <footer className="border-t py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Visualize suas finanças de forma clara e objetiva</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
