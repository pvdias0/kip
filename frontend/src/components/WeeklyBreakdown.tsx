import { DailyStats } from './DailyStats';
import { useWeeklyStats } from '@/hooks/useWeeklyStats';
import { Transaction } from '@/types/finance';
import { isToday } from 'date-fns';

interface WeeklyBreakdownProps {
  transactions: Transaction[];
  weekStart: Date;
}

export function WeeklyBreakdown({ transactions, weekStart }: WeeklyBreakdownProps) {
  const dayStats = useWeeklyStats(transactions, weekStart);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Detalhamento Diário</h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {dayStats.map((day) => (
          <DailyStats
            key={day.date.toISOString()}
            dayName={day.dayName}
            date={day.date}
            totalIncome={day.totalIncome}
            totalExpense={day.totalExpense}
            balance={day.balance}
            transactions={day.transactions}
            isToday={isToday(day.date)}
          />
        ))}
      </div>
    </div>
  );
}
