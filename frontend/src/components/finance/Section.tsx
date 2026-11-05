import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionProps = {
  title: ReactNode;
  action?: { label: string; to?: string; onClick?: () => void };
  children: ReactNode;
  className?: string;
};

export function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {action ? (
          action.to ? (
            <Link to={action.to} className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}
