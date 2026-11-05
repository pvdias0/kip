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
  is_credit?: boolean;
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
  debt_id?: number | null;
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

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CardInfo {
  owed: number;
  open_invoice: number;
  closed_invoice: number;
  credit_limit: number | null;
  available_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  next_closing_date: string | null;
  next_due_date: string | null;
}

export interface AccountOverview {
  id: number;
  name: string;
  balance: number;
  initial_balance: number;
  has_card: boolean;
  has_debit: boolean;
  payment_method_ids: number[];
  card: CardInfo | null;
}

export type DebtKind = "loan" | "financing" | "installment" | "other";

export interface Debt {
  id: number;
  name: string;
  kind: DebtKind;
  creditor: string | null;
  notes: string | null;
  amount_due: number;
  installment_amount: number | null;
  installments_total: number | null;
  installments_paid_before: number;
  installments_paid: number;
  due_day: number | null;
  start_date: string;
  paid_amount: number;
  remaining: number;
  last_payment_date: string | null;
  next_due_date: string | null;
  settled: boolean;
  closed_at: string | null;
}

export interface FinanceOverview {
  today: string;
  cash_total: number;
  cards_owed: number;
  debts_total: number;
  net_worth: number;
  previous_month_cash: number;
  accounts: AccountOverview[];
  unassigned: { balance: number; opening_balance: number; card_owed: number };
  debts: Debt[];
  month: { start: string; end: string; income: number; expense: number; result: number };
}

export interface AccountTransfer {
  id: number;
  kind: "transfer" | "card_payment";
  amount: number;
  date: string;
  description: string | null;
  from_account_id: number | null;
  from_account_name: string | null;
  to_account_id: number | null;
  to_account_name: string | null;
}
