import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthNavigatorProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}

export function MonthNavigator({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth,
  canGoNext 
}: MonthNavigatorProps) {
  const monthYear = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Button 
        variant="outline" 
        size="icon"
        onClick={onPreviousMonth}
        className="h-10 w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-lg font-semibold capitalize min-w-[200px] text-center">
        {monthYear}
      </span>
      <Button 
        variant="outline" 
        size="icon"
        onClick={onNextMonth}
        disabled={!canGoNext}
        className="h-10 w-10"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
