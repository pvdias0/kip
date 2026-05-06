import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PaginationInfo,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/types/finance";
import { apiService } from "@/services/api";
import { useSocket } from "./useSocket";
import { toast } from "@/components/ui/use-toast";

interface UseTransactionsOptions {
  enabled?: boolean;
  fetchAll?: boolean;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface EntriesFilters {
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const FETCH_ALL_LIMIT = 100;

function normalizeTransaction(transaction: Transaction): Transaction {
  const amount =
    typeof transaction.amount === "string"
      ? Number.parseFloat(transaction.amount)
      : transaction.amount;

  return {
    ...transaction,
    amount: Number.isFinite(amount) ? amount : 0,
    date:
      typeof transaction.date === "string"
        ? transaction.date.slice(0, 10)
        : transaction.date,
  };
}

function normalizeTransactions(transactions: Transaction[]) {
  return transactions.map(normalizeTransaction);
}

function normalizePagination(pagination: PaginationInfo | null | undefined) {
  if (!pagination) {
    return null;
  }

  return {
    page: Number(pagination.page) || DEFAULT_PAGE,
    limit: Number(pagination.limit) || DEFAULT_LIMIT,
    totalItems: Number(pagination.totalItems) || 0,
    totalPages: Number(pagination.totalPages) || 1,
    hasNextPage: Boolean(pagination.hasNextPage),
    hasPreviousPage: Boolean(pagination.hasPreviousPage),
  } satisfies PaginationInfo;
}

async function fetchAllTransactions(filters: EntriesFilters) {
  const limit = filters.limit ?? FETCH_ALL_LIMIT;
  let currentPage = 1;
  let hasNextPage = true;
  const transactions: Transaction[] = [];

  while (hasNextPage) {
    const response = await apiService.getEntries({
      ...filters,
      page: currentPage,
      limit,
    });

    transactions.push(...(response.entries ?? []));
    hasNextPage = Boolean(response.pagination?.hasNextPage);
    currentPage += 1;
  }

  return normalizeTransactions(transactions);
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const {
    enabled = true,
    fetchAll = false,
    type,
    startDate,
    endDate,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = options;
  const { on, isConnected } = useSocket();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      type,
      startDate,
      endDate,
      page,
      limit: fetchAll ? Math.max(limit, FETCH_ALL_LIMIT) : limit,
    }),
    [type, startDate, endDate, page, limit, fetchAll],
  );

  const refreshTransactions = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (fetchAll) {
        const allTransactions = await fetchAllTransactions(filters);
        setTransactions(allTransactions);
        setPagination(null);
      } else {
        const response = await apiService.getEntries(filters);
        setTransactions(normalizeTransactions(response.entries ?? []));
        setPagination(normalizePagination(response.pagination));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar transacoes";

      setError(message);
      console.error("Fetch transactions error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetchAll, filters]);

  useEffect(() => {
    if (!enabled) {
      setTransactions([]);
      setPagination(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    void refreshTransactions();
  }, [enabled, refreshTransactions]);

  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    const refetch = () => {
      void refreshTransactions();
    };

    const unsubscribeCreated = on("transaction:created", refetch);
    const unsubscribeUpdated = on("transaction:updated", refetch);
    const unsubscribeDeleted = on("transaction:deleted", refetch);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [enabled, isConnected, on, refreshTransactions]);

  const addTransaction = useCallback(
    async (transaction: TransactionInput) => {
      try {
        setError(null);

        await apiService.createEntry({
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          category_id: transaction.category_id,
          payment_method_id: transaction.payment_method_id,
          payment_account_id: transaction.payment_account_id,
          date: transaction.date,
        });

        if (enabled && !isConnected) {
          await refreshTransactions();
        }

        toast({
          title: "Transacao criada",
          description: "A transacao foi registrada com sucesso.",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao adicionar transacao";

        setError(message);
        throw err;
      }
    },
    [enabled, isConnected, refreshTransactions],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      try {
        setError(null);

        const numericId = Number.parseInt(id, 10);
        const deletedTransaction = transactions.find(
          (transaction) => transaction.id === numericId,
        );

        await apiService.deleteEntry(numericId);

        setTransactions((previousTransactions) =>
          previousTransactions.filter((transaction) => transaction.id !== numericId),
        );

        if (enabled && !isConnected) {
          await refreshTransactions();
        }

        toast({
          title: "Transacao deletada",
          description: deletedTransaction
            ? `"${deletedTransaction.description}" foi removida com sucesso.`
            : "A transacao foi removida com sucesso.",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao deletar transacao";

        setError(message);
        throw err;
      }
    },
    [enabled, isConnected, refreshTransactions, transactions],
  );

  return {
    transactions,
    pagination,
    isLoading,
    error,
    refreshTransactions,
    addTransaction,
    deleteTransaction,
  };
}
