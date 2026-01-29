import { useMemo } from 'react';
import { Transaction } from '@/types/finance';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export function useTransactionStats(transactions: Transaction[], selectedMonth: Date) {
  return useMemo(() => {
    // Filter transactions for the selected month
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    const monthTransactions = transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    // Separate income and expenses
    const incomes = monthTransactions.filter(t => t.type === 'income');
    const expenses = monthTransactions.filter(t => t.type === 'expense');

    // Top 5 expenses
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Top 5 incomes
    const topIncomes = [...incomes]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Category breakdown for expenses
    const expensesByCategory = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const expenseCategoryData = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Category breakdown for incomes
    const incomesByCategory = incomes.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const incomeCategoryData = Object.entries(incomesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Totals
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    return {
      topExpenses,
      topIncomes,
      expenseCategoryData,
      incomeCategoryData,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions, selectedMonth]);
}
