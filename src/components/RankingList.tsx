import { Transaction } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RankingListProps {
  transactions: Transaction[];
  title: string;
  type: 'income' | 'expense';
  emptyMessage?: string;
}

export function RankingList({ transactions, title, type, emptyMessage = "Nenhuma transação" }: RankingListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg",
              type === 'income' ? "bg-income-muted" : "bg-expense-muted"
            )}
          >
            <span className={cn("text-2xl font-bold w-8", getMedalColor(index))}>
              #{index + 1}
            </span>
            <div className={cn(
              "rounded-full p-2",
              type === 'income' ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
            )}>
              {type === 'income' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-background px-2 py-0.5 rounded-full">{transaction.category}</span>
                <span>•</span>
                <span>{format(parseISO(transaction.date), "dd/MM", { locale: ptBR })}</span>
              </div>
            </div>
            <span className={cn(
              "font-bold text-lg",
              type === 'income' ? "text-income" : "text-expense"
            )}>
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
