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
import { TrendingUp, TrendingDown, Trash2, Calendar, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      opacity: 0,
      x: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (transactions.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <motion.div
            className="flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-5 mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Adicione sua primeira transação usando o botão "Nova Transação"
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform translate-x-10 -translate-y-10 text-primary">
        <Receipt className="w-full h-full" />
      </div>

      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg font-display flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">{title}</span>
          </CardTitle>
          <span className="w-fit text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
            {transactions.length} {transactions.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <ScrollArea className="w-full custom-scrollbar" style={{ height: maxHeight }}>
          <motion.div
            className="px-4 sm:px-6 py-4 space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {transactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  variants={itemVariants}
                  layout
                  exit="exit"
                  whileHover={{ x: 4 }}
                  className={cn(
                    "group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-xl transition-all duration-300",
                    "border",
                    transaction.type === "income"
                      ? "bg-income-muted border-income/10 hover:border-income/30 hover:shadow-md hover:shadow-income/5"
                      : "bg-expense-muted border-expense/10 hover:border-expense/30 hover:shadow-md hover:shadow-expense/5",
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Icon */}
                    <motion.div
                      className={cn(
                        "rounded-xl p-2.5 flex-shrink-0 transition-all duration-300",
                        transaction.type === "income"
                          ? "bg-income/10 text-income group-hover:bg-income/20"
                          : "bg-expense/10 text-expense group-hover:bg-expense/20",
                      )}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </motion.div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-foreground transition-colors">
                        {transaction.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                          transaction.type === "income"
                            ? "bg-income/10 text-income"
                            : "bg-expense/10 text-expense"
                        )}>
                          {transaction.category_id
                            ? `#${transaction.category_id}`
                            : "Sem categoria"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:justify-end">
                    {/* Amount */}
                    <div className="flex min-w-0 flex-1 flex-col items-start sm:flex-none sm:items-end">
                      <span
                        className={cn(
                          "text-sm font-bold number-highlight sm:text-lg",
                          transaction.type === "income"
                            ? "text-income"
                            : "text-expense",
                        )}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>

                    {/* Delete Button */}
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
                          className="h-9 w-9 text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 flex-shrink-0 transition-all rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:max-w-md mx-auto">
                        <div className="flex flex-col items-center text-center mb-4">
                          <div className="p-4 rounded-2xl bg-destructive/10 text-destructive mb-4">
                            <AlertTriangle className="h-8 w-8" />
                          </div>
                          <AlertDialogTitle className="text-xl font-display">
                            Deletar transação?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="mt-2">
                            Tem certeza que deseja deletar{" "}
                            <span className="font-semibold text-foreground">
                              "{transaction.description}"
                            </span>
                            ? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </div>
                        <div className="flex gap-3">
                          <AlertDialogCancel className="flex-1 h-11">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              onDelete(transaction.id);
                              setOpenDelete(null);
                            }}
                            className="flex-1 h-11 bg-destructive hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
