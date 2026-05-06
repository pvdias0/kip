import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionStats } from "@/hooks/useTransactionStats";
import { MonthNavigator } from "@/components/MonthNavigator";
import { RankingList } from "@/components/RankingList";
import { CategoryChart } from "@/components/CategoryChart";
import { SummaryCard } from "@/components/SummaryCard";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { addMonths, subMonths, isSameMonth, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, type Variants } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
  const { transactions } = useTransactions({
    startDate: monthStart,
    endDate: monthEnd,
    fetchAll: true,
  });

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

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <AppShell title="Dashboard" subtitle={today}>
      <motion.main
        className="container-app flex-1 space-y-8 py-6 sm:py-8"
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

        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Distribuição por Forma de Pagamento
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart
              data={stats.incomePaymentMethodData}
              title="Ganhos por forma"
              type="income"
              emptyMessage="Nenhum ganho registrado"
            />
            <CategoryChart
              data={stats.expensePaymentMethodData}
              title="Gastos por forma"
              type="expense"
              emptyMessage="Nenhum gasto registrado"
            />
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Distribuição por Conta de Pagamento
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart
              data={stats.incomePaymentAccountData}
              title="Ganhos por conta"
              type="income"
              emptyMessage="Nenhum ganho registrado"
            />
            <CategoryChart
              data={stats.expensePaymentAccountData}
              title="Gastos por conta"
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

      <motion.footer
        className="mt-auto border-t border-border/50 bg-background/50 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="container-app text-center">
          <p className="text-sm text-muted-foreground">
            Visualize suas financas de forma clara e objetiva
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} KIP • Seu organizador financeiro
          </p>
        </div>
      </motion.footer>
    </AppShell>
  );
};

export default Dashboard;
