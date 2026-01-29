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

  const getWeeklySummary = useCallback((): TransactionSummary => {
    const now = new Date();
    const filtered = getFilteredTransactions(startOfWeek(now, { weekStartsOn: 0 }), endOfWeek(now, { weekStartsOn: 0 }));
    return getSummary(filtered);
  }, [getFilteredTransactions, getSummary]);

  const getMonthlySummary = useCallback((): TransactionSummary => {
    const now = new Date();
    const filtered = getFilteredTransactions(startOfMonth(now), endOfMonth(now));
    return getSummary(filtered);
  }, [getFilteredTransactions, getSummary]);

  const getWeeklyTransactions = useCallback((): Transaction[] => {
    const now = new Date();
    return getFilteredTransactions(startOfWeek(now, { weekStartsOn: 0 }), endOfWeek(now, { weekStartsOn: 0 }));
  }, [getFilteredTransactions]);

  const getMonthlyTransactions = useCallback((): Transaction[] => {
    const now = new Date();
    return getFilteredTransactions(startOfMonth(now), endOfMonth(now));
  }, [getFilteredTransactions]);

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    getWeeklySummary,
    getMonthlySummary,
    getWeeklyTransactions,
    getMonthlyTransactions,
    getSummary,
  };
}
