import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  tone?: "primary" | "income" | "expense";
  children: ReactNode;
};

const selectedTone = {
  primary: "border-primary bg-primary text-primary-foreground",
  income: "border-income bg-income text-income-foreground",
  expense: "border-expense bg-expense text-expense-foreground",
};

/** Opcao clicavel (substitui selects: tudo visivel, um toque). */
export function Chip({ selected, tone = "primary", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected
          ? selectedTone[tone]
          : "border-border bg-background text-foreground [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:bg-accent/60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ChipGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-sm font-semibold text-foreground">{children}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
