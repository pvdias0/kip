import { Transaction } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Trophy, Medal, Award, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface RankingListProps {
  transactions: Transaction[];
  title: string;
  type: "income" | "expense";
  emptyMessage?: string;
}

export function RankingList({
  transactions,
  title,
  type,
  emptyMessage = "Nenhuma transação",
}: RankingListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4" />;
      case 1:
        return <Medal className="h-4 w-4" />;
      case 2:
        return <Award className="h-4 w-4" />;
      default:
        return <Star className="h-3.5 w-3.5" />;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-400/30";
      case 1:
        return "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-400/20";
      case 2:
        return "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-950 shadow-lg shadow-orange-400/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const IconComponent = type === "income" ? TrendingUp : TrendingDown;

  if (transactions.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
            )}>
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn(
              "p-4 rounded-full mb-4",
              type === "income" ? "bg-income/5" : "bg-expense/5"
            )}>
              <IconComponent className={cn(
                "h-8 w-8",
                type === "income" ? "text-income/40" : "text-expense/40"
              )} />
            </div>
            <p className="text-muted-foreground text-sm">
              {emptyMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
      {/* Decorative accent */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 opacity-5 transform translate-x-10 -translate-y-10",
        type === "income" ? "text-income" : "text-expense"
      )}>
        <Trophy className="w-full h-full" />
      </div>

      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 relative">
        <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            type === "income" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
          )}>
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-6">
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, x: 4 }}
              className={cn(
                "group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-300",
                "border border-transparent",
                type === "income"
                  ? "bg-income-muted hover:border-income/20 hover:shadow-md hover:shadow-income/5"
                  : "bg-expense-muted hover:border-expense/20 hover:shadow-md hover:shadow-expense/5",
              )}
            >
              {/* Rank Badge */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110",
                getRankStyle(index)
              )}>
                {getRankIcon(index)}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "rounded-full p-2.5 flex-shrink-0 transition-all duration-300",
                  type === "income"
                    ? "bg-income/10 text-income group-hover:bg-income/20"
                    : "bg-expense/10 text-expense group-hover:bg-expense/20",
                )}
              >
                <IconComponent className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate group-hover:text-foreground transition-colors">
                  {transaction.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                    type === "income"
                      ? "bg-income/10 text-income"
                      : "bg-expense/10 text-expense"
                  )}>
                    {transaction.category_id
                      ? `#${transaction.category_id}`
                      : "Sem categoria"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(transaction.date), "dd 'de' MMM", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="ml-auto flex min-w-0 flex-col items-end flex-shrink-0">
                <span
                  className={cn(
                    "text-sm font-bold number-highlight sm:text-lg",
                    type === "income" ? "text-income" : "text-expense",
                  )}
                >
                  {formatCurrency(transaction.amount)}
                </span>
                {index === 0 && (
                  <span className={cn(
                    "text-[10px] font-medium uppercase tracking-wider mt-0.5",
                    type === "income" ? "text-income/60" : "text-expense/60"
                  )}>
                    Maior valor
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
