import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";

import { Money } from "@/components/finance/Money";
import { useEntrySheet } from "@/components/entry/EntrySheetProvider";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type EntryRowProps = {
  transaction: Transaction;
  categoryName?: string | null;
  showDate?: boolean;
};

/** Linha de lancamento: toque para editar (sem botoes escondidos no hover). */
export function EntryRow({ transaction, categoryName, showDate }: EntryRowProps) {
  const { openEdit } = useEntrySheet();
  const isIncome = transaction.type === "income";
  const Icon = transaction.debt_id ? Landmark : isIncome ? ArrowDownLeft : ArrowUpRight;
  const payment = [transaction.payment_account_name, transaction.payment_method_name].filter(Boolean).join(" · ");
  const details = [categoryName || "Sem categoria", payment, showDate ? formatShortDate(transaction.date) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => openEdit(transaction)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{transaction.description}</span>
        <span className="block truncate text-xs text-muted-foreground">{details}</span>
      </span>
      <Money
        value={isIncome ? transaction.amount : -transaction.amount}
        signed
        className={cn("shrink-0 text-sm font-semibold", isIncome ? "text-income" : "text-foreground")}
      />
    </button>
  );
}
