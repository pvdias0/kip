import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { EntryForm } from "@/components/entry/EntryForm";
import type { Transaction, TransactionType } from "@/types/finance";

type EntrySheetProps = {
  open: boolean;
  formKey: number;
  type: TransactionType;
  transaction?: Transaction;
  onClose: () => void;
};

/** Folha + formulario de lancamento. Carregada sob demanda pelo EntrySheetProvider. */
export default function EntrySheet({ open, formKey, type, transaction, onClose }: EntrySheetProps) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => (next ? null : onClose())}
      title={transaction ? "Editar lançamento" : "Novo lançamento"}
    >
      {open ? (
        <EntryForm key={formKey} transaction={transaction} initialType={type} onDone={onClose} />
      ) : null}
    </ResponsiveSheet>
  );
}
