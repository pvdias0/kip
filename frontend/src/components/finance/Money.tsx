import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

import { formatCurrency, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const KEY = "kip:hide-values";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getHidden() {
  return localStorage.getItem(KEY) === "1";
}

export function useHiddenValues() {
  const hidden = useSyncExternalStore(subscribe, getHidden, () => false);
  const toggle = () => {
    localStorage.setItem(KEY, hidden ? "0" : "1");
    listeners.forEach((listener) => listener());
  };
  return { hidden, toggle };
}

type MoneyProps = {
  value: number;
  signed?: boolean;
  /** pinta de verde/vermelho conforme o sinal */
  colored?: boolean;
  className?: string;
};

/** Valor em reais que respeita o "esconder valores". */
export function Money({ value, signed, colored, className }: MoneyProps) {
  const { hidden } = useHiddenValues();
  return (
    <span
      className={cn(
        "tabular-nums",
        colored && value > 0 && "text-income",
        colored && value < 0 && "text-expense",
        className,
      )}
    >
      {hidden ? "R$ ••••" : signed ? formatSignedCurrency(value) : formatCurrency(value)}
    </span>
  );
}

export function HideValuesButton({ className }: { className?: string }) {
  const { hidden, toggle } = useHiddenValues();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? "Mostrar valores" : "Esconder valores"}
      title={hidden ? "Mostrar valores" : "Esconder valores"}
      className={cn("rounded-full p-2 transition-colors hover:bg-white/15", className)}
    >
      {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}
