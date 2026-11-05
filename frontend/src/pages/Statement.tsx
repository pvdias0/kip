import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Chip, ChipGroup } from "@/components/entry/Chip";
import { useEntrySheet } from "@/components/entry/EntrySheetProvider";
import { EntryRow } from "@/components/finance/EntryRow";
import { Money } from "@/components/finance/Money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryNameMap } from "@/hooks/useFinanceData";
import { useTransactions } from "@/hooks/useTransactions";
import { capitalize, formatDayHeading, formatMonthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/finance";

type Period = "month" | "week";
const WEEK_OPTIONS = { weekStartsOn: 0 as const };

function sumBy(transactions: Transaction[], type: TransactionType) {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}

function WeekBars({ transactions, weekStart }: { transactions: Transaction[]; weekStart: Date }) {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, WEEK_OPTIONS) });
  const totals = days.map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    return transactions.filter((t) => t.type === "expense" && t.date === iso).reduce((s, t) => s + t.amount, 0);
  });
  const max = Math.max(...totals, 1);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Gastos por dia</p>
      <div className="flex h-28 items-end gap-2">
        {days.map((day, index) => (
          <div key={day.toISOString()} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-expense/70"
                style={{ height: `${Math.max((totals[index] / max) * 100, totals[index] > 0 ? 6 : 2)}%` }}
                title={`${format(day, "EEEE", { locale: ptBR })}: R$ ${totals[index].toFixed(2)}`}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">{capitalize(format(day, "EEEEEE", { locale: ptBR }))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const Statement = () => {
  const { openNew } = useEntrySheet();
  const categoryNames = useCategoryNameMap();
  const [period, setPeriod] = useState<Period>("month");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), WEEK_OPTIONS));
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [search, setSearch] = useState("");

  const range =
    period === "month"
      ? { start: month, end: endOfMonth(month) }
      : { start: weekStart, end: endOfWeek(weekStart, WEEK_OPTIONS) };

  const { transactions, isLoading } = useTransactions({
    startDate: format(range.start, "yyyy-MM-dd"),
    endDate: format(range.end, "yyyy-MM-dd"),
    fetchAll: true,
  });

  const now = new Date();
  const canGoNext = period === "month" ? !isSameMonth(month, now) : !isAfter(addWeeks(weekStart, 1), now);

  const go = (delta: number) => {
    if (period === "month") setMonth((m) => (delta > 0 ? addMonths(m, 1) : subMonths(m, 1)));
    else setWeekStart((w) => addWeeks(w, delta));
  };

  const switchPeriod = (next: Period) => {
    setPeriod(next);
    if (next === "week") {
      // semana de hoje se o mes atual estiver aberto, senao a primeira semana do mes
      setWeekStart(startOfWeek(isSameMonth(month, now) ? now : month, WEEK_OPTIONS));
    } else {
      setMonth(startOfMonth(weekStart));
    }
  };

  const label =
    period === "month"
      ? formatMonthLabel(month)
      : `${format(range.start, "d MMM", { locale: ptBR })} – ${format(range.end, "d MMM", { locale: ptBR })}`;

  const income = sumBy(transactions, "income");
  const expense = sumBy(transactions, "expense");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (!query) return true;
      const category = t.category_id ? categoryNames.get(t.category_id) ?? "" : "";
      return [t.description, category, t.payment_account_name, t.payment_method_name]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(query));
    });
  }, [transactions, typeFilter, search, categoryNames]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      map.set(t.date, [...(map.get(t.date) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <AppShell title="Extrato" subtitle="Tudo o que entrou e saiu">
      <main className="container-app flex-1 space-y-4 py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:w-56">
            {(["month", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchPeriod(option)}
                className={cn(
                  "h-9 rounded-lg text-sm font-semibold transition-colors",
                  period === option ? "bg-background text-foreground shadow" : "text-muted-foreground",
                )}
              >
                {option === "month" ? "Mês" : "Semana"}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Período anterior">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="min-w-[10rem] text-center font-display font-semibold">{label}</span>
            <Button variant="outline" size="icon" onClick={() => go(1)} disabled={!canGoNext} aria-label="Próximo período">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card py-3 text-center">
          <div className="px-2">
            <p className="text-xs text-muted-foreground">Entrou</p>
            <Money value={income} className="block truncate text-sm font-semibold text-income sm:text-base" />
          </div>
          <div className="px-2">
            <p className="text-xs text-muted-foreground">Saiu</p>
            <Money value={expense} className="block truncate text-sm font-semibold text-expense sm:text-base" />
          </div>
          <div className="px-2">
            <p className="text-xs text-muted-foreground">Resultado</p>
            <Money value={income - expense} signed colored className="block truncate text-sm font-semibold sm:text-base" />
          </div>
        </div>

        {period === "week" ? <WeekBars transactions={transactions} weekStart={weekStart} /> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipGroup className="flex-nowrap">
            {(
              [
                ["all", "Tudo"],
                ["expense", "Gastos"],
                ["income", "Ganhos"],
              ] as const
            ).map(([value, text]) => (
              <Chip key={value} selected={typeFilter === value} onClick={() => setTypeFilter(value)}>
                {text}
              </Chip>
            ))}
          </ChipGroup>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar descrição, categoria, conta…"
              className="h-10 rounded-full pl-9 pr-9"
              aria-label="Buscar lançamentos"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card p-2 sm:p-3">
          {isLoading && transactions.length === 0 ? (
            <div className="space-y-3 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-medium">{search || typeFilter !== "all" ? "Nada encontrado com esse filtro." : "Nenhum lançamento neste período."}</p>
              {!search && typeFilter === "all" ? (
                <Button className="mt-4 gap-2" onClick={() => openNew()}>
                  <Plus className="h-4 w-4" /> Novo lançamento
                </Button>
              ) : null}
            </div>
          ) : (
            groups.map(([date, items]) => {
              const dayTotal = sumBy(items, "income") - sumBy(items, "expense");
              return (
                <div key={date} className="pb-2">
                  <div className="flex items-center justify-between px-2 pb-1 pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDayHeading(date)}</h3>
                    <Money value={dayTotal} signed className="text-xs text-muted-foreground" />
                  </div>
                  {items.map((transaction) => (
                    <EntryRow
                      key={transaction.id}
                      transaction={transaction}
                      categoryName={transaction.category_id ? categoryNames.get(transaction.category_id) : null}
                    />
                  ))}
                </div>
              );
            })
          )}
        </section>
        {filtered.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} · toque em um para editar ou excluir
          </p>
        ) : null}
      </main>
    </AppShell>
  );
};

export default Statement;
