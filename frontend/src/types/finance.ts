export type TransactionType = "income" | "expense";

export interface PaymentAccount {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface PaymentMethod {
  id: number;
  user_id: number;
  name: string;
  accounts_enabled: boolean;
  is_default: boolean;
  created_at: string;
  deleted_at?: string | null;
  accounts: PaymentAccount[];
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number | null;
  payment_method_id: number | null;
  payment_account_id: number | null;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // ISO date string
  created_at: string; // ISO timestamp
  payment_method_name?: string | null;
  payment_account_name?: string | null;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  category_id?: number;
  payment_method_id: number;
  payment_account_id?: number;
  date: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
