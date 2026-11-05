import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { notifyDataChanged } from "@/lib/data-events";
import { cn } from "@/lib/utils";

export function MoneyInput({
  id,
  value,
  onChange,
  allowNegative,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  allowNegative?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-input px-3 focus-within:border-primary">
      <span className="font-semibold text-muted-foreground">R$</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0,00"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(allowNegative ? /[^\d.,-]/g : /[^\d.,]/g, ""))}
        className="h-full w-full min-w-0 bg-transparent text-lg font-semibold tabular-nums outline-none"
      />
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function DayInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder="Dia"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 2))}
      className="h-11"
    />
  );
}

export function toNumberOrNull(value: string) {
  if (!value.trim()) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Executa uma acao, mostra o resultado e atualiza a visao geral. */
export function useFinanceAction() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string, onSuccess?: () => void) => {
    try {
      setIsRunning(true);
      await action();
      notifyDataChanged();
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-setup"] });
      toast({ title: success });
      onSuccess?.();
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível concluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  return { run, isRunning };
}

export function SubmitButton({ isRunning, children }: { isRunning: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={isRunning} className="h-12 w-full text-base font-semibold">
      {isRunning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
      {children}
    </Button>
  );
}
