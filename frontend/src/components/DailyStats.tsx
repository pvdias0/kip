import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
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
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full text-left"
          aria-label={`Abrir detalhes de ${dayName}`}
        >
          <Card
            className={cn(
              'h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
              isToday && 'ring-2 ring-primary bg-primary/5'
            )}
          >
            <CardHeader className="space-y-3 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold capitalize">
                    {dayName}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dayDate} de {monthAbbr}
                  </p>
                </div>
                {isToday && (
                  <div className="rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">
                    Hoje
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Saldo
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-base font-bold sm:text-lg',
                      balance >= 0 ? 'text-income' : 'text-expense'
                    )}
                  >
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-income/10 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Ganhos</p>
                  <p className="mt-1 font-semibold text-income">
                    {formatCurrency(totalIncome)}
                  </p>
                </div>
                <div className="rounded-lg bg-expense/10 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Gastos</p>
                  <p className="mt-1 font-semibold text-expense">
                    {formatCurrency(totalExpense)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Mov.</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {transactions.length}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Clique para ver os detalhes do dia.
              </p>
            </CardContent>
          </Card>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {dayName} - {dayDate} de {monthAbbr}
          </DialogTitle>
          <DialogDescription>
            Resumo completo das movimentações do dia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-income/10 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-income" />
              <p className="text-sm text-muted-foreground">Ganhos</p>
            </div>
            <p className="mt-2 text-base font-semibold text-income">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="rounded-xl bg-expense/10 p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-expense" />
              <p className="text-sm text-muted-foreground">Gastos</p>
            </div>
            <p className="mt-2 text-base font-semibold text-expense">
              {formatCurrency(totalExpense)}
            </p>
          </div>

          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Saldo</p>
            </div>
            <p
              className={cn(
                'mt-2 text-base font-semibold',
                balance >= 0 ? 'text-income' : 'text-expense'
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Transações do dia
            </p>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {transactions.length} item{transactions.length === 1 ? '' : 's'}
            </span>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="rounded-xl border bg-card p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                            tx.type === 'income' ? 'bg-income' : 'bg-expense'
                          )}
                        />
                        <p className="whitespace-pre-wrap break-words text-sm font-medium text-foreground">
                          {tx.description}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {tx.payment_method_name && (
                          <span className="rounded-full bg-muted px-2 py-1">
                            {tx.payment_method_name}
                          </span>
                        )}
                        {tx.payment_account_name && (
                          <span className="rounded-full bg-muted px-2 py-1">
                            {tx.payment_account_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-sm font-semibold sm:pl-4',
                        tx.type === 'income' ? 'text-income' : 'text-expense'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Nenhuma transação registrada neste dia.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
