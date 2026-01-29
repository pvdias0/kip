import { useTransactions } from '@/hooks/useTransactions';
import { TransactionForm } from '@/components/TransactionForm';
import { PeriodTabs } from '@/components/PeriodTabs';
import { Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Index = () => {
  const {
    addTransaction,
    deleteTransaction,
    getWeeklySummary,
    getMonthlySummary,
    getWeeklyTransactions,
    getMonthlyTransactions,
  } = useTransactions();

  const weeklySummary = getWeeklySummary();
  const monthlySummary = getMonthlySummary();
  const weeklyTransactions = getWeeklyTransactions();
  const monthlyTransactions = getMonthlyTransactions();

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2">
                <Wallet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Minhas Finanças</h1>
                <p className="text-sm text-muted-foreground capitalize">{today}</p>
              </div>
            </div>
            <TransactionForm onSubmit={addTransaction} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <PeriodTabs
          weeklySummary={weeklySummary}
          monthlySummary={monthlySummary}
          weeklyTransactions={weeklyTransactions}
          monthlyTransactions={monthlyTransactions}
          onDeleteTransaction={deleteTransaction}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Organize suas finanças de forma simples e eficiente</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
