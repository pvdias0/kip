import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/types/finance';
import { SummaryCard } from './SummaryCard';
import { TransactionList } from './TransactionList';
import { MonthNavigator } from './MonthNavigator';
import { WeekSelector } from './WeekSelector';
import { WeeklyBreakdown } from './WeeklyBreakdown';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, isSameMonth, startOfWeek } from 'date-fns';
import { useTransactions } from '@/hooks/useTransactions';

interface PeriodTabsProps {
  onDeleteTransaction: (id: string) => void;
}

export function PeriodTabs({ onDeleteTransaction }: PeriodTabsProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  const {
    getWeekSummary,
    getMonthSummary,
    getWeekTransactions,
    getMonthTransactions,
  } = useTransactions();

  const now = new Date();
  const canGoNext = !isSameMonth(selectedMonth, now);

  const handlePreviousMonth = () => {
    const newMonth = subMonths(selectedMonth, 1);
    setSelectedMonth(newMonth);
    setSelectedWeek(startOfWeek(startOfMonth(newMonth), { weekStartsOn: 0 }));
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      const newMonth = addMonths(selectedMonth, 1);
      setSelectedMonth(newMonth);
      setSelectedWeek(startOfWeek(startOfMonth(newMonth), { weekStartsOn: 0 }));
    }
  };

  const handleWeekChange = (weekStart: Date) => {
    setSelectedWeek(weekStart);
  };

  const weekSummary = getWeekSummary(selectedWeek);
  const monthSummary = getMonthSummary(selectedMonth);
  const weekTransactions = getWeekTransactions(selectedWeek);
  const monthTransactions = getMonthTransactions(selectedMonth);

  return (
    <div className="space-y-4">
      <MonthNavigator
        currentDate={selectedMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        canGoNext={canGoNext}
      />

      <Tabs defaultValue="month" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês Completo</TabsTrigger>
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
            transactions={weekTransactions} 
            weekStart={selectedWeek}
          />
          
          <TransactionList
            transactions={weekTransactions}
            onDelete={onDeleteTransaction}
            title="Transações da Semana"
          />
        </TabsContent>

        <TabsContent value="month" className="space-y-6 animate-in fade-in-50">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Ganhos do Mês"
              value={monthSummary.totalIncome}
              icon={TrendingUp}
              variant="income"
            />
            <SummaryCard
              title="Gastos do Mês"
              value={monthSummary.totalExpense}
              icon={TrendingDown}
              variant="expense"
            />
            <SummaryCard
              title="Saldo do Mês"
              value={monthSummary.balance}
              icon={Wallet}
            />
          </div>
          <TransactionList
            transactions={monthTransactions}
            onDelete={onDeleteTransaction}
            title="Transações do Mês"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
