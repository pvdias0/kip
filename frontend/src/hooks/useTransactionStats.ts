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

    // Category breakdown for expenses
    const expensesByCategory = expenses.reduce(
      (acc, t) => {
        const categoryName = getCategoryName(t.category_id);
        const amount =
          typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
        acc[categoryName] =
          (acc[categoryName] || 0) + (isNaN(amount) ? 0 : amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const expenseCategoryData = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Category breakdown for incomes
    const incomesByCategory = incomes.reduce(
      (acc, t) => {
        const categoryName = getCategoryName(t.category_id);
        const amount =
          typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
        acc[categoryName] =
          (acc[categoryName] || 0) + (isNaN(amount) ? 0 : amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const incomeCategoryData = Object.entries(incomesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

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
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions, selectedMonth, getCategoryName]);
}
