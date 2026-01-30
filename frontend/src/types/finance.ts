export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number | null;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // ISO date string
  created_at: string; // ISO timestamp
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
