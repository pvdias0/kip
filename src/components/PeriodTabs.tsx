import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionSummary, Transaction } from '@/types/finance';
import { SummaryCard } from './SummaryCard';
import { TransactionList } from './TransactionList';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface PeriodTabsProps {
  weeklySummary: TransactionSummary;
  monthlySummary: TransactionSummary;
  weeklyTransactions: Transaction[];
  monthlyTransactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

export function PeriodTabs({
  weeklySummary,
  monthlySummary,
  weeklyTransactions,
  monthlyTransactions,
  onDeleteTransaction,
}: PeriodTabsProps) {
  return (
    <Tabs defaultValue="month" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
        <TabsTrigger value="week">Esta Semana</TabsTrigger>
        <TabsTrigger value="month">Este Mês</TabsTrigger>
      </TabsList>

      <TabsContent value="week" className="space-y-6 animate-in fade-in-50">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Ganhos da Semana"
            value={weeklySummary.totalIncome}
            icon={TrendingUp}
            variant="income"
          />
          <SummaryCard
            title="Gastos da Semana"
            value={weeklySummary.totalExpense}
            icon={TrendingDown}
            variant="expense"
          />
          <SummaryCard
            title="Saldo da Semana"
            value={weeklySummary.balance}
            icon={Wallet}
          />
        </div>
        <TransactionList
          transactions={weeklyTransactions}
          onDelete={onDeleteTransaction}
          title="Transações da Semana"
        />
      </TabsContent>

      <TabsContent value="month" className="space-y-6 animate-in fade-in-50">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Ganhos do Mês"
            value={monthlySummary.totalIncome}
            icon={TrendingUp}
            variant="income"
          />
          <SummaryCard
            title="Gastos do Mês"
            value={monthlySummary.totalExpense}
            icon={TrendingDown}
            variant="expense"
          />
          <SummaryCard
            title="Saldo do Mês"
            value={monthlySummary.balance}
            icon={Wallet}
          />
        </div>
        <TransactionList
          transactions={monthlyTransactions}
          onDelete={onDeleteTransaction}
          title="Transações do Mês"
        />
      </TabsContent>
    </Tabs>
  );
}
