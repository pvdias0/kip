import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionSummary } from '@/types/finance';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

const STORAGE_KEY = 'finance-transactions';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch {
        setTransactions([]);
      }
    }
  }, []);

  const saveTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
  }, []);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveTransactions([newTransaction, ...transactions]);
  }, [transactions, saveTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    saveTransactions(transactions.filter(t => t.id !== id));
  }, [transactions, saveTransactions]);

  const getFilteredTransactions = useCallback((
    startDate: Date,
    endDate: Date
  ): Transaction[] => {
    return transactions.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  }, [transactions]);

  const getSummary = useCallback((filteredTransactions: Transaction[]): TransactionSummary => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, []);

  // Get summary for a specific week
  const getWeekSummary = useCallback((weekStart: Date): TransactionSummary => {
    const filtered = getFilteredTransactions(
      startOfWeek(weekStart, { weekStartsOn: 0 }), 
      endOfWeek(weekStart, { weekStartsOn: 0 })
    );
    return getSummary(filtered);
  }, [getFilteredTransactions, getSummary]);

  // Get summary for a specific month
  const getMonthSummary = useCallback((monthDate: Date): TransactionSummary => {
    const filtered = getFilteredTransactions(startOfMonth(monthDate), endOfMonth(monthDate));
    return getSummary(filtered);
  }, [getFilteredTransactions, getSummary]);

  // Get transactions for a specific week
  const getWeekTransactions = useCallback((weekStart: Date): Transaction[] => {
    return getFilteredTransactions(
      startOfWeek(weekStart, { weekStartsOn: 0 }), 
      endOfWeek(weekStart, { weekStartsOn: 0 })
    );
  }, [getFilteredTransactions]);

  // Get transactions for a specific month
  const getMonthTransactions = useCallback((monthDate: Date): Transaction[] => {
    return getFilteredTransactions(startOfMonth(monthDate), endOfMonth(monthDate));
  }, [getFilteredTransactions]);

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    getWeekSummary,
    getMonthSummary,
    getWeekTransactions,
    getMonthTransactions,
    getSummary,
  };
}
