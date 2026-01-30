import { Transaction } from "@/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrendingUp, TrendingDown, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  title?: string;
  maxHeight?: string;
}

export function TransactionList({
  transactions,
  onDelete,
  title = "Transações Recentes",
  maxHeight = "400px",
}: TransactionListProps) {
  const [openDelete, setOpenDelete] = useState<string | null>(null);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
            <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione sua primeira transação acima
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <ScrollArea className="w-full" style={{ height: maxHeight }}>
          <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all hover:shadow-md",
                  transaction.type === "income"
                    ? "bg-income-muted border border-income/10"
                    : "bg-expense-muted border border-expense/10",
                )}
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={cn(
                      "rounded-full p-1.5 sm:p-2 flex-shrink-0",
                      transaction.type === "income"
                        ? "bg-income/10 text-income"
                        : "bg-expense/10 text-expense",
                    )}
                  >
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-base text-foreground truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="bg-muted px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                        {transaction.category_id
                          ? `#${transaction.category_id}`
                          : "Sem categoria"}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatDate(transaction.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                  <span
                    className={cn(
                      "font-semibold text-xs sm:text-base whitespace-nowrap",
                      transaction.type === "income"
                        ? "text-income"
                        : "text-expense",
                    )}
                  >
                    {transaction.type === "income" ? "+" : "-"}{" "}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <AlertDialog
                    open={openDelete === transaction.id}
                    onOpenChange={(open) =>
                      setOpenDelete(open ? transaction.id : null)
                    }
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] sm:max-w-sm mx-auto">
                      <AlertDialogTitle className="text-base sm:text-lg">Deletar transação?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        Tem certeza que deseja deletar a transação "
                        {transaction.description}"? Esta ação não pode ser
                        desfeita.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel className="text-xs sm:text-sm">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDelete(transaction.id);
                            setOpenDelete(null);
                          }}
                          className="bg-destructive hover:bg-destructive/90 text-xs sm:text-sm"
                        >
                          Deletar
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
