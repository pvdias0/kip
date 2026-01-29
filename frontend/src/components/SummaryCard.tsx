import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense';
  subtitle?: string;
}

export function SummaryCard({ title, value, icon: Icon, variant = 'default', subtitle }: SummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      variant === 'income' && "border-income/20 bg-income-muted",
      variant === 'expense' && "border-expense/20 bg-expense-muted",
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn(
              "text-2xl font-bold tracking-tight",
              variant === 'income' && "text-income",
              variant === 'expense' && "text-expense",
              variant === 'default' && "text-foreground"
            )}>
              {formatCurrency(value)}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "rounded-xl p-3",
            variant === 'income' && "bg-income/10 text-income",
            variant === 'expense' && "bg-expense/10 text-expense",
            variant === 'default' && "bg-primary/10 text-primary"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
