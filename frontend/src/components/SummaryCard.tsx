import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  trend
}: SummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      y: -4,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2
      }
    }
  };

  const numberVariants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        delay: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-shadow duration-300",
        "backdrop-blur-sm",
        variant === 'income' && "bg-gradient-to-br from-income-muted via-income-muted to-income/5",
        variant === 'expense' && "bg-gradient-to-br from-expense-muted via-expense-muted to-expense/5",
        variant === 'default' && "bg-gradient-to-br from-card via-card to-primary/5",
      )}>
        {/* Decorative Background Pattern */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 opacity-10 transform translate-x-8 -translate-y-8",
          variant === 'income' && "text-income",
          variant === 'expense' && "text-expense",
          variant === 'default' && "text-primary"
        )}>
          <Icon className="w-full h-full" />
        </div>

        {/* Gradient Overlay */}
        <div className={cn(
          "absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500",
          "bg-gradient-to-tr from-transparent via-transparent to-white/10 dark:to-white/5"
        )} />

        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                {title}
              </p>
              <motion.p
                variants={numberVariants}
                className={cn(
                  "text-3xl font-bold tracking-tight number-highlight",
                  variant === 'income' && "text-income",
                  variant === 'expense' && "text-expense",
                  variant === 'default' && (value >= 0 ? "text-foreground" : "text-expense")
                )}
              >
                {formatCurrency(value)}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <div className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  trend.isPositive
                    ? "bg-income/10 text-income"
                    : "bg-expense/10 text-expense"
                )}>
                  <span>{trend.isPositive ? '↑' : '↓'}</span>
                  <span>{Math.abs(trend.value)}% este mês</span>
                </div>
              )}
            </div>
            <motion.div
              variants={iconVariants}
              className={cn(
                "rounded-2xl p-4 shadow-lg",
                variant === 'income' && "bg-gradient-to-br from-income to-income/80 text-income-foreground income-glow",
                variant === 'expense' && "bg-gradient-to-br from-expense to-expense/80 text-expense-foreground expense-glow",
                variant === 'default' && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground btn-primary-glow"
              )}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
          </div>
        </CardContent>

        {/* Bottom Accent Line */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 opacity-60",
          variant === 'income' && "bg-gradient-to-r from-income via-income/50 to-transparent",
          variant === 'expense' && "bg-gradient-to-r from-expense via-expense/50 to-transparent",
          variant === 'default' && "bg-gradient-to-r from-primary via-primary/50 to-transparent"
        )} />
      </Card>
    </motion.div>
  );
}
