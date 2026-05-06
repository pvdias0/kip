import { useState, useEffect, useCallback } from "react";
import { Transaction, TransactionInput, TransactionSummary } from "@/types/finance";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { apiService } from "@/services/api";
import { useSocket } from "./useSocket";

interface TransactionsStoreState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
}

const initialStoreState: TransactionsStoreState = {
  transactions: [],
  isLoading: false,
  error: null,
  hasLoaded: false,
};

let storeState = initialStoreState;
let pendingFetch: Promise<void> | null = null;
const storeListeners = new Set<(state: TransactionsStoreState) => void>();

function emitStoreState() {
  storeListeners.forEach((listener) => listener(storeState));
}

function setStoreState(
  updater:
    | TransactionsStoreState
    | ((previousState: TransactionsStoreState) => TransactionsStoreState),
) {
  storeState =
    typeof updater === "function"
      ? updater(storeState)
      : updater;

  emitStoreState();
}

function subscribeToStore(listener: (state: TransactionsStoreState) => void) {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

function normalizeTransaction(transaction: Transaction): Transaction {
  const amount =
    typeof transaction.amount === "string"
      ? parseFloat(transaction.amount)
      : transaction.amount;

  return {
    ...transaction,
    amount: Number.isFinite(amount) ? amount : 0,
    date: typeof transaction.date === "string"
      ? transaction.date.slice(0, 10)
      : transaction.date,
  };
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (right.created_at ?? "").localeCompare(left.created_at ?? "");
  });
}

function replaceTransactionsInStore(transactions: Transaction[]) {
  const normalizedTransactions = transactions.map(normalizeTransaction);

  setStoreState((previousState) => ({
    ...previousState,
    transactions: sortTransactions(normalizedTransactions),
  }));
}

function upsertTransactionInStore(transaction: Transaction) {
  const normalizedTransaction = normalizeTransaction(transaction);

  setStoreState((previousState) => ({
    ...previousState,
    transactions: sortTransactions([
      normalizedTransaction,
      ...previousState.transactions.filter(
        (currentTransaction) => currentTransaction.id !== normalizedTransaction.id,
      ),
    ]),
  }));
}

function removeTransactionFromStore(transactionId: number) {
  setStoreState((previousState) => ({
    ...previousState,
    transactions: previousState.transactions.filter(
      (transaction) => transaction.id !== transactionId,
    ),
  }));
}

async function fetchTransactionsFromApi() {
  if (pendingFetch) {
    return pendingFetch;
  }

  pendingFetch = (async () => {
    setStoreState((previousState) => ({
      ...previousState,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await apiService.getEntries();

      replaceTransactionsInStore(response.entries ?? []);

      setStoreState((previousState) => ({
        ...previousState,
        isLoading: false,
        error: null,
        hasLoaded: true,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar transações";

      setStoreState((previousState) => ({
        ...previousState,
        isLoading: false,
        error: message,
        hasLoaded: true,
      }));

      console.error("Fetch transactions error:", err);
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

export function useTransactions() {
  const [state, setState] = useState(storeState);
  const { on, isConnected } = useSocket();

  useEffect(() => subscribeToStore(setState), []);

  useEffect(() => {
    if (!storeState.hasLoaded && !storeState.isLoading) {
      void fetchTransactionsFromApi();
    }
  }, []);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const unsubscribeCreated = on("transaction:created", (newTransaction) => {
      upsertTransactionInStore(newTransaction as Transaction);
    });

    const unsubscribeUpdated = on("transaction:updated", (updatedTransaction) => {
      upsertTransactionInStore(updatedTransaction as Transaction);
    });

    const unsubscribeDeleted = on("transaction:deleted", (data) => {
      const transactionId = Number((data as { id: string | number }).id);

      if (Number.isInteger(transactionId)) {
        removeTransactionFromStore(transactionId);
      }
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [isConnected, on]);

  const addTransaction = useCallback(async (transaction: TransactionInput) => {
    try {
      setStoreState((previousState) => ({
        ...previousState,
        error: null,
      }));

      const response = await apiService.createEntry({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category_id: transaction.category_id,
        payment_method_id: transaction.payment_method_id,
        payment_account_id: transaction.payment_account_id,
        date: transaction.date,
      });

      if (response?.entry) {
        upsertTransactionInStore(response.entry as Transaction);
      } else {
        await fetchTransactionsFromApi();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao adicionar transação";

      setStoreState((previousState) => ({
        ...previousState,
        error: message,
      }));

      throw err;
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setStoreState((previousState) => ({
        ...previousState,
        error: null,
      }));

      const numericId = Number.parseInt(id, 10);

      await apiService.deleteEntry(numericId);
      removeTransactionFromStore(numericId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao deletar transação";

      setStoreState((previousState) => ({
        ...previousState,
        error: message,
      }));

      throw err;
    }
  }, []);

  const getFilteredTransactions = useCallback(
    (startDate: Date, endDate: Date): Transaction[] => {
      return state.transactions.filter((transaction) => {
        const date = parseISO(transaction.date);
        return isWithinInterval(date, { start: startDate, end: endDate });
      });
    },
    [state.transactions],
  );

  const getSummary = useCallback(
    (filteredTransactions: Transaction[]): TransactionSummary => {
      const totalIncome = filteredTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const totalExpense = filteredTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      };
    },
    [],
  );

  const getWeekSummary = useCallback(
    (weekStart: Date): TransactionSummary => {
      const filteredTransactions = getFilteredTransactions(
        startOfWeek(weekStart, { weekStartsOn: 0 }),
        endOfWeek(weekStart, { weekStartsOn: 0 }),
      );

      return getSummary(filteredTransactions);
    },
    [getFilteredTransactions, getSummary],
  );

  const getMonthSummary = useCallback(
    (monthDate: Date): TransactionSummary => {
      const filteredTransactions = getFilteredTransactions(
        startOfMonth(monthDate),
        endOfMonth(monthDate),
      );

      return getSummary(filteredTransactions);
    },
    [getFilteredTransactions, getSummary],
  );

  const getWeekTransactions = useCallback(
    (weekStart: Date): Transaction[] => {
      return getFilteredTransactions(
        startOfWeek(weekStart, { weekStartsOn: 0 }),
        endOfWeek(weekStart, { weekStartsOn: 0 }),
      );
    },
    [getFilteredTransactions],
  );

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
    transactions: state.transactions,
    addTransaction,
    deleteTransaction,
    getWeekSummary,
    getMonthSummary,
    getWeekTransactions,
    getMonthTransactions,
    getSummary,
    isLoading: state.isLoading,
    error: state.error,
  };
}
