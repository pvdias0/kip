import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiService } from "@/services/api";
import { onDataChanged } from "@/lib/data-events";
import { useSocket } from "@/hooks/useSocket";
import type { AccountTransfer, FinanceOverview, PaymentAccount, PaymentMethod } from "@/types/finance";
import type { Category } from "@/hooks/useCategories";

export const financeKeys = {
  overview: ["finance", "overview"] as const,
  transfers: ["finance", "transfers"] as const,
  categories: ["categories"] as const,
  paymentSetup: ["payment-setup"] as const,
};

export function useOverview() {
  return useQuery({
    queryKey: financeKeys.overview,
    queryFn: async () => (await apiService.getFinanceOverview()).overview as FinanceOverview,
    staleTime: 30_000,
  });
}

export function useTransfers(limit = 20) {
  return useQuery({
    queryKey: [...financeKeys.transfers, limit],
    queryFn: async () => ((await apiService.getTransfers(limit)).transfers ?? []) as AccountTransfer[],
    staleTime: 30_000,
  });
}

/** Categorias compartilhadas por todos os formularios (uma chamada so). */
export function useCategoryList() {
  return useQuery({
    queryKey: financeKeys.categories,
    queryFn: async () => ((await apiService.getCategories()).categories ?? []) as Category[],
    staleTime: 5 * 60_000,
  });
}

export function usePaymentSetup() {
  return useQuery({
    queryKey: financeKeys.paymentSetup,
    queryFn: async () => {
      const response = await apiService.getPaymentMethods();
      return {
        methods: ((response.paymentMethods ?? []) as PaymentMethod[]).sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        ),
        accounts: ((response.paymentAccounts ?? []) as PaymentAccount[]).sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR"),
        ),
      };
    },
    staleTime: 5 * 60_000,
  });
}

/** Mantem visao geral/contas atualizadas (socket do WhatsApp + mudancas locais). */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { on, isConnected } = useSocket();

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      void queryClient.invalidateQueries({ queryKey: financeKeys.paymentSetup });
    };
    const offLocal = onDataChanged(refresh);
    if (!isConnected) return offLocal;

    const offs = [
      on("transaction:created", refresh),
      on("transaction:updated", refresh),
      on("transaction:deleted", refresh),
      on("finance:updated", refresh),
    ];
    return () => {
      offLocal();
      offs.forEach((off) => off());
    };
  }, [isConnected, on, queryClient]);
}

/** id -> nome da categoria (usa o cache compartilhado). */
export function useCategoryNameMap() {
  const { data = [] } = useCategoryList();
  return new Map(data.map((category) => [category.id, category.name]));
}
