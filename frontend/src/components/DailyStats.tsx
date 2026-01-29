import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/finance';

interface DailyStatsProps {
  dayName: string;
  date: Date;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
  isToday?: boolean;
}

export function DailyStats({
  dayName,
  date,
  totalIncome,
  totalExpense,
  balance,
  transactions,
  isToday = false,
}: DailyStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const dayDate = format(date, 'dd', { locale: ptBR });
  const monthAbbr = format(date, 'MMM', { locale: ptBR });

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        isToday && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold capitalize">
              {dayName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {dayDate} de {monthAbbr}
            </p>
          </div>
          {isToday && (
            <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
              Hoje
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded p-2 bg-income/10">
              <TrendingUp className="h-4 w-4 text-income" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ganhos</p>
              <p className="text-sm font-semibold text-income">
                {formatCurrency(totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded p-2 bg-expense/10">
              <TrendingDown className="h-4 w-4 text-expense" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gastos</p>
              <p className="text-sm font-semibold text-expense">
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-1">Saldo</p>
          <p
            className={cn(
              'text-lg font-bold',
              balance >= 0 ? 'text-income' : 'text-expense'
            )}
          >
            {formatCurrency(balance)}
          </p>
        </div>

        {transactions.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Transações ({transactions.length})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 bg-muted/40 rounded text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        tx.type === 'income' ? 'bg-income' : 'bg-expense'
                      )}
                    />
                    <span className="text-muted-foreground truncate">
                      {tx.description}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-semibold whitespace-nowrap ml-2',
                      tx.type === 'income' ? 'text-income' : 'text-expense'
                    )}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
