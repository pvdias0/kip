import { useCallback, useEffect, useState } from "react";
import { TransactionSummary } from "@/types/finance";
import { apiService } from "@/services/api";
import { useSocket } from "./useSocket";

interface UseEntryStatsOptions {
  enabled?: boolean;
  startDate?: string;
  endDate?: string;
}

const emptyStats: TransactionSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
};

export function useEntryStats(options: UseEntryStatsOptions = {}) {
  const { enabled = true, startDate, endDate } = options;
  const { on, isConnected } = useSocket();
  const [stats, setStats] = useState<TransactionSummary>(emptyStats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getStats({ startDate, endDate });
      setStats(response.stats ?? emptyStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar totais";
      setError(message);
      console.error("Fetch entry stats error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, startDate, endDate]);

  useEffect(() => {
    if (!enabled) {
      setStats(emptyStats);
      setError(null);
      setIsLoading(false);
      return;
    }

    void refreshStats();
  }, [enabled, refreshStats]);

  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    const refetch = () => {
      void refreshStats();
    };

    const unsubscribeCreated = on("transaction:created", refetch);
    const unsubscribeUpdated = on("transaction:updated", refetch);
    const unsubscribeDeleted = on("transaction:deleted", refetch);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [enabled, isConnected, on, refreshStats]);

  return {
    stats,
    isLoading,
    error,
    refreshStats,
  };
}
