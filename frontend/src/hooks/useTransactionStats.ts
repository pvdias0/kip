import { useMemo } from "react";
import { Transaction } from "@/types/finance";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { useCategoryNames } from "./useCategoryNames";

export function useTransactionStats(
  transactions: Transaction[],
  selectedMonth: Date,
) {
  const { getCategoryName } = useCategoryNames();

  return useMemo(() => {
    const aggregateByLabel = (
      items: Transaction[],
      getLabel: (transaction: Transaction) => string,
    ) => {
      const grouped = items.reduce(
        (acc, transaction) => {
          const label = getLabel(transaction);
          const amount =
            typeof transaction.amount === "string"
              ? parseFloat(transaction.amount)
              : transaction.amount;

          acc[label] = (acc[label] || 0) + (isNaN(amount) ? 0 : amount);
          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(grouped)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    };

    // Filter transactions for the selected month
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const monthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Separate income and expenses
    const incomes = monthTransactions.filter((t) => t.type === "income");
    const expenses = monthTransactions.filter((t) => t.type === "expense");

    // Top 5 expenses
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Top 5 incomes
    const topIncomes = [...incomes]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const getPaymentMethodLabel = (transaction: Transaction) =>
      transaction.payment_method_name?.trim() || "Sem forma de pagamento";
    const getPaymentAccountLabel = (transaction: Transaction) =>
      transaction.payment_account_name?.trim() || "Sem conta vinculada";

    const expenseCategoryData = aggregateByLabel(expenses, (transaction) =>
      getCategoryName(transaction.category_id),
    );
    const incomeCategoryData = aggregateByLabel(incomes, (transaction) =>
      getCategoryName(transaction.category_id),
    );
    const expensePaymentMethodData = aggregateByLabel(
      expenses,
      getPaymentMethodLabel,
    );
    const incomePaymentMethodData = aggregateByLabel(
      incomes,
      getPaymentMethodLabel,
    );
    const expensePaymentAccountData = aggregateByLabel(
      expenses,
      getPaymentAccountLabel,
    );
    const incomePaymentAccountData = aggregateByLabel(
      incomes,
      getPaymentAccountLabel,
    );

    // Totals - Converter para número se for string
    const totalIncome = incomes.reduce((sum, t) => {
      const amount =
        typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const totalExpense = expenses.reduce((sum, t) => {
      const amount =
        typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return {
      topExpenses,
      topIncomes,
      expenseCategoryData,
      incomeCategoryData,
      expensePaymentMethodData,
      incomePaymentMethodData,
      expensePaymentAccountData,
      incomePaymentAccountData,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions, selectedMonth, getCategoryName]);
}
