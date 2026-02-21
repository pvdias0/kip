import { useState, useEffect, useCallback } from "react";
import { Transaction, TransactionSummary } from "@/types/finance";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";
import { apiService } from "@/services/api";
import { useSocket } from "./useSocket";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { on, isConnected } = useSocket();

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getEntries();

      // Use API response directly - no transformation needed
      setTransactions(response.entries);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar transações";
      setError(message);
      console.error("Fetch transactions error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Escutar eventos de WebSocket
  useEffect(() => {
    if (!isConnected) {
      console.log("[Transactions] ⏳ Socket não conectado ainda");
      return;
    }

    console.log("[Transactions] 🎧 Escutando eventos de WebSocket...");

    // Nova transação criada
    const unsubscribeCreated = on(
      "transaction:created",
      (newTransaction: any) => {
        console.log("[Transactions] 🆕 Nova transação recebida via socket:", newTransaction);
        setTransactions((prev) => [newTransaction, ...prev]);
      },
    );

    // Transação atualizada
    const unsubscribeUpdated = on(
      "transaction:updated",
      (updatedTransaction: any) => {
        console.log("[Transactions] ✏️  Transação atualizada via socket:", updatedTransaction);
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === updatedTransaction.id ? updatedTransaction : t,
          ),
        );
      },
    );

    // Transação deletada
    const unsubscribeDeleted = on(
      "transaction:deleted",
      (data: { id: number }) => {
        console.log("[Transactions] 🗑️  Transação deletada via socket:", data);
        setTransactions((prev) => prev.filter((t) => t.id !== data.id));
      },
    );

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [isConnected, on]);

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id" | "user_id" | "created_at">) => {
      try {
        setError(null);
        await apiService.createEntry({
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          category_id: transaction.category_id,
          date: transaction.date,
        });

        // Socket event will update the list automatically
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao adicionar transação";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setError(null);
      await apiService.deleteEntry(parseInt(id));

      // Socket event will update the list automatically
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao deletar transação";
      setError(message);
      throw err;
    }
  }, []);

  const getFilteredTransactions = useCallback(
    (startDate: Date, endDate: Date): Transaction[] => {
      return transactions.filter((t) => {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start: startDate, end: endDate });
      });
    },
    [transactions],
  );

  const getSummary = useCallback(
    (filteredTransactions: Transaction[]): TransactionSummary => {
      const totalIncome = filteredTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      };
    },
    [],
  );

  // Get summary for a specific week
  const getWeekSummary = useCallback(
    (weekStart: Date): TransactionSummary => {
      const filtered = getFilteredTransactions(
        startOfWeek(weekStart, { weekStartsOn: 0 }),
        endOfWeek(weekStart, { weekStartsOn: 0 }),
      );
      return getSummary(filtered);
    },
    [getFilteredTransactions, getSummary],
  );

  // Get summary for a specific month
  const getMonthSummary = useCallback(
    (monthDate: Date): TransactionSummary => {
      const filtered = getFilteredTransactions(
        startOfMonth(monthDate),
        endOfMonth(monthDate),
      );
      return getSummary(filtered);
    },
    [getFilteredTransactions, getSummary],
  );

  // Get transactions for a specific week
  const getWeekTransactions = useCallback(
    (weekStart: Date): Transaction[] => {
      return getFilteredTransactions(
        startOfWeek(weekStart, { weekStartsOn: 0 }),
        endOfWeek(weekStart, { weekStartsOn: 0 }),
      );
    },
    [getFilteredTransactions],
  );

  // Get transactions for a specific month
  const getMonthTransactions = useCallback(
    (monthDate: Date): Transaction[] => {
      return getFilteredTransactions(
        startOfMonth(monthDate),
        endOfMonth(monthDate),
      );
    },
    [getFilteredTransactions],
  );

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    getWeekSummary,
    getMonthSummary,
    getWeekTransactions,
    getMonthTransactions,
    getSummary,
    isLoading,
    error,
  };
}
