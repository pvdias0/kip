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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2">
                <BarChart3 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground capitalize">
                  {today}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {user?.username}
                </p>
              </div>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Categorias</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        <MonthNavigator
          currentDate={selectedMonth}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          canGoNext={canGoNext}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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
        <div className="grid gap-6 lg:grid-cols-2">
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
        <div className="grid gap-6 lg:grid-cols-2">
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
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Visualize suas finanças de forma clara e objetiva</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
