import { useCallback, useEffect, useState } from "react";

import { apiService } from "@/services/api";
import { PaymentAccount, PaymentMethod } from "@/types/finance";

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function sortMethods(items: PaymentMethod[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getPaymentMethods();
      setPaymentMethods(
        sortMethods((response.paymentMethods as PaymentMethod[]) || []),
      );
      setPaymentAccounts(
        sortByName((response.paymentAccounts as PaymentAccount[]) || []),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao buscar formas de pagamento";
      setError(message);
      console.error("Fetch payment methods error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = useCallback(
    async (name: string, accountsEnabled: boolean) => {
      try {
        setError(null);
        const response = await apiService.createPaymentMethod(
          name,
          accountsEnabled,
        );
        const createdMethod = {
          ...(response.paymentMethod as PaymentMethod),
          accounts: [],
        };
        setPaymentMethods((prev) => sortMethods([...prev, createdMethod]));
        return createdMethod;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao criar forma de pagamento";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const updatePaymentMethod = useCallback(
    async (
      id: number,
      data: Partial<{ name: string; accounts_enabled: boolean }>,
    ) => {
      try {
        setError(null);
        const response = await apiService.updatePaymentMethod(id, data);
        const updatedMethod = response.paymentMethod as PaymentMethod;
        setPaymentMethods((prev) =>
          sortMethods(
            prev.map((method) =>
              method.id === id
                ? {
                    ...method,
                    ...updatedMethod,
                    accounts: method.accounts,
                  }
                : method,
            ),
          ),
        );
        return updatedMethod;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao atualizar forma de pagamento";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const removePaymentMethod = useCallback(async (id: number) => {
    try {
      setError(null);
      await apiService.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao deletar forma de pagamento";
      setError(message);
      throw err;
    }
  }, []);

  const addPaymentAccount = useCallback(async (name: string) => {
    try {
      setError(null);
      const response = await apiService.createPaymentAccount(name);
      const createdAccount = response.paymentAccount as PaymentAccount;
      setPaymentAccounts((prev) => sortByName([...prev, createdAccount]));
      return createdAccount;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta";
      setError(message);
      throw err;
    }
  }, []);

  const updatePaymentAccount = useCallback(async (id: number, name: string) => {
    try {
      setError(null);
      const response = await apiService.updatePaymentAccount(id, name);
      const updatedAccount = response.paymentAccount as PaymentAccount;

      setPaymentAccounts((prev) =>
        sortByName(
          prev.map((account) => (account.id === id ? updatedAccount : account)),
        ),
      );

      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          accounts: sortByName(
            method.accounts.map((account) =>
              account.id === id ? updatedAccount : account,
            ),
          ),
        })),
      );

      return updatedAccount;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar conta";
      setError(message);
      throw err;
    }
  }, []);

  const removePaymentAccount = useCallback(async (id: number) => {
    try {
      setError(null);
      await apiService.deletePaymentAccount(id);
      setPaymentAccounts((prev) => prev.filter((account) => account.id !== id));
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          accounts: method.accounts.filter((account) => account.id !== id),
        })),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao deletar conta";
      setError(message);
      throw err;
    }
  }, []);

  const linkPaymentAccount = useCallback(
    async (paymentMethodId: number, paymentAccountId: number) => {
      try {
        setError(null);
        const response = await apiService.linkPaymentAccount(
          paymentMethodId,
          paymentAccountId,
        );
        const linkedAccount = response.paymentAccount as PaymentAccount;

        setPaymentMethods((prev) =>
          prev.map((method) => {
            if (method.id !== paymentMethodId) {
              return method;
            }

            const alreadyLinked = method.accounts.some(
              (account) => account.id === linkedAccount.id,
            );

            return {
              ...method,
              accounts: alreadyLinked
                ? method.accounts
                : sortByName([...method.accounts, linkedAccount]),
            };
          }),
        );

        return linkedAccount;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao vincular conta";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const unlinkPaymentAccount = useCallback(
    async (paymentMethodId: number, paymentAccountId: number) => {
      try {
        setError(null);
        await apiService.unlinkPaymentAccount(paymentMethodId, paymentAccountId);
        setPaymentMethods((prev) =>
          prev.map((method) =>
            method.id === paymentMethodId
              ? {
                  ...method,
                  accounts: method.accounts.filter(
                    (account) => account.id !== paymentAccountId,
                  ),
                }
              : method,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao desvincular conta";
        setError(message);
        throw err;
      }
    },
    [],
  );

  return {
    paymentMethods,
    paymentAccounts,
    isLoading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    addPaymentAccount,
    updatePaymentAccount,
    removePaymentAccount,
    linkPaymentAccount,
    unlinkPaymentAccount,
    refetch: fetchPaymentMethods,
  };
}
