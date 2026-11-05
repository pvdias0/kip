import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Info, Landmark, Plus, Wallet } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { EntryRow } from "@/components/finance/EntryRow";
import { HideValuesButton, Money } from "@/components/finance/Money";
import { Section } from "@/components/finance/Section";
import { useEntrySheet } from "@/components/entry/EntrySheetProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useCategoryNameMap, useOverview } from "@/hooks/useFinanceData";
import { useTransactions } from "@/hooks/useTransactions";
import { capitalize, formatDueLabel } from "@/lib/format";
import type { FinanceOverview } from "@/types/finance";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

function HeroCard({ overview }: { overview: FinanceOverview }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[hsl(190_70%_32%)] p-5 text-primary-foreground shadow-lg sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary-foreground/80">Saldo em contas</p>
          <Money value={overview.cash_total} className="mt-1 block font-display text-3xl font-bold sm:text-4xl" />
        </div>
        <HideValuesButton className="-mr-2 -mt-1 text-primary-foreground" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-black/15 p-3 text-xs sm:text-sm">
        <div className="min-w-0">
          <p className="text-primary-foreground/75">Faturas</p>
          <Money value={-overview.cards_owed} className="block truncate font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="text-primary-foreground/75">Dívidas</p>
          <Money value={-overview.debts_total} className="block truncate font-semibold" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-primary-foreground/75">
            Patrimônio
            <Tooltip>
              <TooltipTrigger aria-label="O que é patrimônio">
                <Info className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                Saldo em contas menos faturas de cartão e dívidas. É quanto você teria se pagasse tudo hoje.
              </TooltipContent>
            </Tooltip>
          </p>
          <Money value={overview.net_worth} className="block truncate font-semibold" />
        </div>
      </div>
    </section>
  );
}

function MonthCard({ overview }: { overview: FinanceOverview }) {
  const monthName = capitalize(format(parseISO(overview.month.start), "MMMM", { locale: ptBR }));
  return (
    <Section title={`Seu mês · ${monthName}`} action={{ label: "Extrato", to: "/extrato" }}>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownLeft className="h-3.5 w-3.5 text-income" /> Entrou
          </p>
          <Money value={overview.month.income} className="block truncate text-sm font-semibold text-income sm:text-base" />
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-expense" /> Saiu
          </p>
          <Money value={overview.month.expense} className="block truncate text-sm font-semibold text-expense sm:text-base" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sobrou</p>
          <Money value={overview.month.result} signed colored className="block truncate text-sm font-semibold sm:text-base" />
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Você começou {monthName.toLowerCase()} com <Money value={overview.previous_month_cash} className="font-semibold text-foreground" /> em
        contas (o que sobrou dos meses anteriores).
      </p>
    </Section>
  );
}

function AccountsCard({ overview }: { overview: FinanceOverview }) {
  const showUnassigned = overview.unassigned.balance !== 0 || overview.accounts.length === 0;
  return (
    <Section title="Contas" action={{ label: "Carteira", to: "/carteira" }}>
      <ul className="divide-y divide-border/60">
        {overview.accounts.map((account) => (
          <li key={account.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {account.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm font-medium">{account.name}</span>
            </span>
            <Money value={account.balance} className="text-sm font-semibold" colored={account.balance < 0} />
          </li>
        ))}
        {showUnassigned ? (
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">Dinheiro e outros</span>
                <span className="block truncate text-xs text-muted-foreground">Lançamentos sem conta</span>
              </span>
            </span>
            <Money value={overview.unassigned.balance} className="text-sm font-semibold" colored={overview.unassigned.balance < 0} />
          </li>
        ) : null}
      </ul>
      {overview.accounts.length === 0 ? (
        <Link
          to="/carteira?nova=1"
          className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-primary/40 p-3 text-sm text-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Cadastre seu banco ou cartão para ver o saldo de cada um.
        </Link>
      ) : null}
    </Section>
  );
}

function CardsCard({ overview }: { overview: FinanceOverview }) {
  const cards = overview.accounts.filter((account) => account.card);
  if (cards.length === 0) return null;
  return (
    <Section title="Cartões de crédito" action={{ label: "Pagar fatura", to: "/carteira?aba=cartoes" }}>
      <ul className="space-y-4">
        {cards.map((account) => {
          const card = account.card!;
          const used = card.credit_limit ? Math.min(100, (Math.max(card.owed, 0) / card.credit_limit) * 100) : null;
          return (
            <li key={account.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{account.name}</span>
                </span>
                <Money value={card.owed} className="text-sm font-semibold text-expense" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {card.closed_invoice > 0 ? (
                  <>
                    Fatura fechada <Money value={card.closed_invoice} /> · {formatDueLabel(card.next_due_date, overview.today) ?? "sem vencimento"}
                  </>
                ) : card.owed > 0 ? (
                  <>Fatura aberta{card.next_closing_date ? ` · fecha ${format(parseISO(card.next_closing_date), "dd/MM")}` : ""}</>
                ) : (
                  "Nada a pagar"
                )}
              </p>
              {used !== null ? (
                <div className="mt-2">
                  <Progress value={used} className="h-1.5" />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Limite disponível <Money value={card.available_limit ?? 0} />
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function UpcomingCard({ overview }: { overview: FinanceOverview }) {
  const items = [
    ...overview.accounts
      .filter((account) => account.card && account.card.closed_invoice > 0 && account.card.next_due_date)
      .map((account) => ({
        key: `card-${account.id}`,
        label: `Fatura ${account.name}`,
        date: account.card!.next_due_date!,
        amount: account.card!.closed_invoice,
        icon: CreditCard,
      })),
    ...overview.debts
      .filter((debt) => !debt.settled && debt.next_due_date)
      .map((debt) => ({
        key: `debt-${debt.id}`,
        label: debt.installments_total
          ? `${debt.name} · ${Math.min(debt.installments_paid + 1, debt.installments_total)}/${debt.installments_total}`
          : debt.name,
        date: debt.next_due_date!,
        amount: debt.installment_amount ?? debt.remaining,
        icon: Landmark,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <Section title="Próximos vencimentos" action={{ label: "Dívidas", to: "/carteira?aba=dividas" }}>
      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3">
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{formatDueLabel(item.date, overview.today)}</span>
              </span>
            </span>
            <Money value={item.amount} className="shrink-0 text-sm font-semibold" />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RecentCard() {
  const { openNew } = useEntrySheet();
  const categoryNames = useCategoryNameMap();
  const { transactions, isLoading } = useTransactions({ page: 1, limit: 6 });

  return (
    <Section title="Últimos lançamentos" action={{ label: "Ver todos", to: "/extrato" }}>
      {isLoading && transactions.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          <Button className="mt-3 gap-2" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> Lançar primeiro gasto
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Dica: você também pode mandar “gastei 25 no almoço” pelo{" "}
            <Link to="/whatsapp" className="text-primary hover:underline">
              WhatsApp
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="-mx-2">
          {transactions.map((transaction) => (
            <EntryRow
              key={transaction.id}
              transaction={transaction}
              categoryName={transaction.category_id ? categoryNames.get(transaction.category_id) : null}
              showDate
            />
          ))}
        </div>
      )}
    </Section>
  );
}

const Home = () => {
  const { user } = useAuth();
  const { data: overview, isLoading, error } = useOverview();
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <AppShell title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} subtitle="Sua vida financeira em um só lugar">
      <main className="container-app flex-1 py-4 sm:py-6">
        {error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Não foi possível carregar seu resumo. Verifique a conexão e tente novamente.
          </p>
        ) : isLoading || !overview ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          /* celular: uma coluna (saldo > mes > contas > cartoes > vencimentos > lancamentos);
             desktop: duas colunas */
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="contents lg:block lg:space-y-6">
              <div className="order-1"><HeroCard overview={overview} /></div>
              <div className="order-2"><MonthCard overview={overview} /></div>
              <div className="order-6"><RecentCard /></div>
            </div>
            <div className="contents lg:block lg:space-y-6">
              <div className="order-3"><AccountsCard overview={overview} /></div>
              <div className="order-4"><CardsCard overview={overview} /></div>
              <div className="order-5"><UpcomingCard overview={overview} /></div>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
};

export default Home;
