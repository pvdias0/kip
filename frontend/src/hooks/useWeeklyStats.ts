import { useMemo } from 'react';
import { Transaction } from '@/types/finance';
import { startOfWeek, endOfWeek, eachDayOfInterval, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayStats {
  date: Date;
  dayName: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
}

export function useWeeklyStats(transactions: Transaction[], weekStart: Date) {
  return useMemo(() => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const dayStats: DayStats[] = daysInWeek.map((day) => {
      const dayTransactions = transactions.filter((t) => {
        const txDate = parseISO(t.date);
        return txDate.toDateString() === day.toDateString();
      });

      const totalIncome = dayTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = dayTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        date: day,
        dayName: format(day, 'EEEE', { locale: ptBR }),
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactions: dayTransactions,
      };
    });

    return dayStats;
  }, [transactions, weekStart]);
}
