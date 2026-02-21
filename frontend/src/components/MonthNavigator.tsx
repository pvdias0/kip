import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

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
    <motion.div
      className="flex items-center justify-center gap-4 py-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={onPreviousMonth}
        className="h-11 w-11 rounded-xl border-2 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <motion.div
        className="flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 px-6 py-3 rounded-xl min-w-[240px] justify-center"
        key={monthYear}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Calendar className="h-5 w-5 text-primary" />
        <span className="text-lg font-display font-semibold capitalize text-foreground">
          {monthYear}
        </span>
      </motion.div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNextMonth}
        disabled={!canGoNext}
        className="h-11 w-11 rounded-xl border-2 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </motion.div>
  );
}
