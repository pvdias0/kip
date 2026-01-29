import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WeekSelectorProps {
  selectedMonth: Date;
  selectedWeek: Date;
  onWeekChange: (weekStart: Date) => void;
}

export function WeekSelector({ selectedMonth, selectedWeek, onWeekChange }: WeekSelectorProps) {
  // Get all weeks in the selected month
  const getWeeksInMonth = (date: Date) => {
    const weeks: Date[] = [];
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    while (currentWeekStart <= monthEnd) {
      weeks.push(currentWeekStart);
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return weeks;
  };

  const weeks = getWeeksInMonth(selectedMonth);

  const formatWeekLabel = (weekStart: Date, index: number) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const startDay = format(weekStart, 'dd', { locale: ptBR });
    const endDay = format(weekEnd, 'dd', { locale: ptBR });
    return `Sem ${index + 1} (${startDay}-${endDay})`;
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center py-2">
      {weeks.map((weekStart, index) => (
        <Button
          key={weekStart.toISOString()}
          variant={isSameWeek(selectedWeek, weekStart, { weekStartsOn: 0 }) ? "default" : "outline"}
          size="sm"
          onClick={() => onWeekChange(weekStart)}
          className={cn(
            "text-xs",
            isSameWeek(selectedWeek, weekStart, { weekStartsOn: 0 }) && "shadow-md"
          )}
        >
          {formatWeekLabel(weekStart, index)}
        </Button>
      ))}
    </div>
  );
}
