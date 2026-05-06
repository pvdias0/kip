import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCard } from "./SummaryCard";
import { TransactionList } from "./TransactionList";
import { MonthNavigator } from "./MonthNavigator";
import { WeekSelector } from "./WeekSelector";
import { WeeklyBreakdown } from "./WeeklyBreakdown";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useTransactions } from "@/hooks/useTransactions";
import { useEntryStats } from "@/hooks/useEntryStats";
import { TransactionSummary } from "@/types/finance";

const PAGE_SIZE = 20;

function buildSummary(totalIncome: number, totalExpense: number): TransactionSummary {
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

function PaginationControls({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Pagina {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}

export function PeriodTabs() {
  const [activeTab, setActiveTab] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [weekPage, setWeekPage] = useState(1);
  const [monthPage, setMonthPage] = useState(1);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 0 });

  const monthStartDate = format(monthStart, "yyyy-MM-dd");
  const monthEndDate = format(monthEnd, "yyyy-MM-dd");
  const weekStartDate = format(weekStart, "yyyy-MM-dd");
  const weekEndDate = format(weekEnd, "yyyy-MM-dd");

  const {
    transactions: weekTransactions,
    pagination: weekPagination,
    isLoading: isWeekTransactionsLoading,
    deleteTransaction: deleteWeekTransaction,
  } = useTransactions({
    enabled: activeTab === "week",
    startDate: weekStartDate,
    endDate: weekEndDate,
    page: weekPage,
    limit: PAGE_SIZE,
  });

  const {
    transactions: weekTransactionsAll,
    isLoading: isWeekBreakdownLoading,
  } = useTransactions({
    enabled: activeTab === "week",
    startDate: weekStartDate,
    endDate: weekEndDate,
    fetchAll: true,
  });

  const {
    transactions: monthTransactions,
    pagination: monthPagination,
    isLoading: isMonthTransactionsLoading,
    deleteTransaction: deleteMonthTransaction,
  } = useTransactions({
    enabled: activeTab === "month",
    startDate: monthStartDate,
    endDate: monthEndDate,
    page: monthPage,
    limit: PAGE_SIZE,
  });

  const { stats: monthSummary } = useEntryStats({
    enabled: activeTab === "month",
    startDate: monthStartDate,
    endDate: monthEndDate,
  });

  const weekSummary = useMemo(() => {
    const totalIncome = weekTransactionsAll
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpense = weekTransactionsAll
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return buildSummary(totalIncome, totalExpense);
  }, [weekTransactionsAll]);

  const now = new Date();
  const canGoNext = !isSameMonth(selectedMonth, now);

  useEffect(() => {
    setMonthPage(1);
  }, [monthStartDate, monthEndDate]);

  useEffect(() => {
    setWeekPage(1);
  }, [weekStartDate, weekEndDate]);

  const handlePreviousMonth = () => {
    const newMonth = subMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    setSelectedWeek(startOfWeek(startOfMonth(newMonth), { weekStartsOn: 0 }));
  };

  const handleNextMonth = () => {
    if (!canGoNext) {
      return;
    }

    const newMonth = addMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    setSelectedWeek(startOfWeek(startOfMonth(newMonth), { weekStartsOn: 0 }));
  };

  const handleWeekChange = (weekStartValue: Date) => {
    setSelectedWeek(weekStartValue);
  };

  return (
    <div className="w-full space-y-4 overflow-x-hidden">
      <MonthNavigator
        currentDate={selectedMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        canGoNext={canGoNext}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes Completo</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-6 animate-in fade-in-50">
          <WeekSelector
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            onWeekChange={handleWeekChange}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Ganhos da Semana"
              value={weekSummary.totalIncome}
              icon={TrendingUp}
              variant="income"
            />
            <SummaryCard
              title="Gastos da Semana"
              value={weekSummary.totalExpense}
              icon={TrendingDown}
              variant="expense"
            />
            <SummaryCard
              title="Saldo da Semana"
              value={weekSummary.balance}
              icon={Wallet}
            />
          </div>

          <WeeklyBreakdown
            transactions={weekTransactionsAll}
            weekStart={selectedWeek}
          />

          <TransactionList
            transactions={weekTransactions}
            onDelete={deleteWeekTransaction}
            title="Transacoes da Semana"
            isLoading={isWeekTransactionsLoading || isWeekBreakdownLoading}
          />

          <PaginationControls
            currentPage={weekPagination?.page ?? 1}
            totalPages={weekPagination?.totalPages ?? 1}
            onPreviousPage={() => setWeekPage((currentPage) => Math.max(1, currentPage - 1))}
            onNextPage={() =>
              setWeekPage((currentPage) =>
                weekPagination?.totalPages
                  ? Math.min(weekPagination.totalPages, currentPage + 1)
                  : currentPage + 1,
              )
            }
          />
        </TabsContent>

        <TabsContent value="month" className="space-y-6 animate-in fade-in-50">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Ganhos do Mes"
              value={monthSummary.totalIncome}
              icon={TrendingUp}
              variant="income"
            />
            <SummaryCard
              title="Gastos do Mes"
              value={monthSummary.totalExpense}
              icon={TrendingDown}
              variant="expense"
            />
            <SummaryCard
              title="Saldo do Mes"
              value={monthSummary.balance}
              icon={Wallet}
            />
          </div>

          <TransactionList
            transactions={monthTransactions}
            onDelete={deleteMonthTransaction}
            title="Transacoes do Mes"
            isLoading={isMonthTransactionsLoading}
          />

          <PaginationControls
            currentPage={monthPagination?.page ?? 1}
            totalPages={monthPagination?.totalPages ?? 1}
            onPreviousPage={() => setMonthPage((currentPage) => Math.max(1, currentPage - 1))}
            onNextPage={() =>
              setMonthPage((currentPage) =>
                monthPagination?.totalPages
                  ? Math.min(monthPagination.totalPages, currentPage + 1)
                  : currentPage + 1,
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
