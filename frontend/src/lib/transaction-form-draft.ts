export interface TransactionFormDraft {
  scope?: string;
  open: boolean;
  type: "income" | "expense";
  amount: string;
  description: string;
  categoryId: string;
  paymentMethodId: string;
  paymentAccountId: string;
  date: string;
}

export interface TransactionReturnContext {
  returnPath: string;
  paymentMethodId: string;
}

const DRAFT_KEY = "kip-transaction-form-draft";
const RETURN_CONTEXT_KEY = "kip-transaction-return-context";
const PENDING_ACCOUNT_KEY = "kip-transaction-pending-account-id";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function saveTransactionDraft(draft: TransactionFormDraft) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadTransactionDraft(scope = "create"): TransactionFormDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(DRAFT_KEY);

  if (!raw) {
    return null;
  }

  try {
    const draft = JSON.parse(raw) as TransactionFormDraft;
    const draftScope = draft.scope || "create";

    return draftScope === scope ? draft : null;
  } catch {
    return null;
  }
}

export function clearTransactionDraft() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(DRAFT_KEY);
}

export function saveTransactionReturnContext(context: TransactionReturnContext) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(RETURN_CONTEXT_KEY, JSON.stringify(context));
}

export function loadTransactionReturnContext(): TransactionReturnContext | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(RETURN_CONTEXT_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TransactionReturnContext;
  } catch {
    return null;
  }
}

export function clearTransactionReturnContext() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(RETURN_CONTEXT_KEY);
}

export function savePendingTransactionAccountId(accountId: number) {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(PENDING_ACCOUNT_KEY, String(accountId));
}

export function loadPendingTransactionAccountId(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(PENDING_ACCOUNT_KEY);
}

export function clearPendingTransactionAccountId() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(PENDING_ACCOUNT_KEY);
}
