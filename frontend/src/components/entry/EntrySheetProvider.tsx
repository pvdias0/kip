import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { EntryForm } from "@/components/entry/EntryForm";
import type { Transaction, TransactionType } from "@/types/finance";

type EntrySheetContextValue = {
  openNew: (type?: TransactionType) => void;
  openEdit: (transaction: Transaction) => void;
};

const EntrySheetContext = createContext<EntrySheetContextValue | null>(null);

type SheetState = { open: boolean; type: TransactionType; transaction?: Transaction; key: number };

/** Um unico formulario de lancamento para o app inteiro (antes havia um por linha da lista). */
export function EntrySheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false, type: "expense", key: 0 });

  const openNew = useCallback(
    (type: TransactionType = "expense") => setState((s) => ({ open: true, type, transaction: undefined, key: s.key + 1 })),
    [],
  );
  const openEdit = useCallback(
    (transaction: Transaction) =>
      setState((s) => ({ open: true, type: transaction.type, transaction, key: s.key + 1 })),
    [],
  );
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  return (
    <EntrySheetContext.Provider value={value}>
      {children}
      <ResponsiveSheet
        open={state.open}
        onOpenChange={(open) => (open ? null : close())}
        title={state.transaction ? "Editar lançamento" : "Novo lançamento"}
      >
        {state.open ? (
          <EntryForm key={state.key} transaction={state.transaction} initialType={state.type} onDone={close} />
        ) : null}
      </ResponsiveSheet>
    </EntrySheetContext.Provider>
  );
}

export function useEntrySheet() {
  const context = useContext(EntrySheetContext);
  if (!context) throw new Error("useEntrySheet precisa do EntrySheetProvider");
  return context;
}
