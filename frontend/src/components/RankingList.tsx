import { Transaction } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-2 sm:space-y-3">
        {transactions.map((transaction, index) => (
          <div
            key={transaction.id}
            className={cn(
              "flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg sm:rounded-lg",
              type === "income" ? "bg-income-muted" : "bg-expense-muted",
            )}
          >
            <span
              className={cn("text-lg xs:text-xl sm:text-2xl font-bold w-6 xs:w-8 flex-shrink-0", getMedalColor(index))}
            >
              #{index + 1}
            </span>
            <div
              className={cn(
                "rounded-full p-1.5 xs:p-2 flex-shrink-0",
                type === "income"
                  ? "bg-income/10 text-income"
                  : "bg-expense/10 text-expense",
              )}
            >
              {type === "income" ? (
                <TrendingUp className="h-3 w-3 xs:h-4 xs:w-4" />
              ) : (
                <TrendingDown className="h-3 w-3 xs:h-4 xs:w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs sm:text-sm truncate">{transaction.description}</p>
              <div className="flex items-center gap-1 xs:gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="bg-background px-1.5 xs:px-2 py-0.5 rounded-full text-xs">
                  {transaction.category_id
                    ? `#${transaction.category_id}`
                    : "Sem categoria"}
                </span>
                <span className="hidden xs:inline">•</span>
                <span>
                  {format(parseISO(transaction.date), "dd/MM", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "font-bold text-sm xs:text-base sm:text-lg whitespace-nowrap flex-shrink-0",
                type === "income" ? "text-income" : "text-expense",
              )}
            >
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
