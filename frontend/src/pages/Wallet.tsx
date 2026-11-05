import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeftRight,
  CreditCard,
  Landmark,
  MoreVertical,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Wallet as WalletIcon,
  CheckCircle2,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { ResponsiveSheet } from "@/components/app/ResponsiveSheet";
import { Money } from "@/components/finance/Money";
import {
  AccountForm,
  AdjustBalanceForm,
  DEBT_KIND_LABELS,
  DebtForm,
  PayDebtForm,
  PayInvoiceForm,
  TransferForm,
} from "@/components/wallet/WalletForms";
import { useFinanceAction } from "@/components/wallet/fields";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOverview, useTransfers } from "@/hooks/useFinanceData";
import { apiService } from "@/services/api";
import { formatDueLabel, formatShortDate } from "@/lib/format";
import type { AccountOverview, Debt, FinanceOverview } from "@/types/finance";

type Sheet =
  | { kind: "new-account" }
  | { kind: "edit-account"; account: AccountOverview }
  | { kind: "adjust"; target: { id: number | "unassigned"; name: string; balance: number } }
  | { kind: "transfer" }
  | { kind: "pay-invoice"; account: AccountOverview }
  | { kind: "new-debt" }
  | { kind: "edit-debt"; debt: Debt }
  | { kind: "pay-debt"; debt: Debt }
  | null;

type Confirm = { title: string; description: string; action: () => Promise<unknown>; success: string } | null;

const TABS = { contas: "Contas", cartoes: "Cartões", dividas: "Dívidas" } as const;
type TabKey = keyof typeof TABS;

function RowMenu({ items }: { items: { label: string; icon: typeof Pencil; onClick: () => void; danger?: boolean }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mais opções" className="h-9 w-9 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, index) => (
          <div key={item.label}>
            {item.danger && index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onClick={item.onClick} className={item.danger ? "text-destructive focus:text-destructive" : undefined}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountsTab({
  overview,
  setSheet,
  setConfirm,
}: {
  overview: FinanceOverview;
  setSheet: (s: Sheet) => void;
  setConfirm: (c: Confirm) => void;
}) {
  const { data: transfers = [] } = useTransfers(10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSheet({ kind: "new-account" })} className="gap-2">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
        <Button variant="outline" onClick={() => setSheet({ kind: "transfer" })} className="gap-2" disabled={overview.accounts.length === 0}>
          <ArrowLeftRight className="h-4 w-4" /> Transferir
        </Button>
      </div>

      {overview.accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm">
          <p className="font-semibold text-foreground">Cadastre onde seu dinheiro fica</p>
          <p className="mt-1 text-muted-foreground">
            Banco, carteira digital ou cartão. Assim o KIP mostra o saldo de cada um e o total, como no app do banco.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {overview.accounts.map((account) => (
          <article key={account.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{account.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[account.has_debit ? "Conta" : null, account.has_card ? "Cartão de crédito" : null].filter(Boolean).join(" + ") ||
                      "Conta"}
                  </p>
                </div>
              </div>
              <RowMenu
                items={[
                  { label: "Editar", icon: Pencil, onClick: () => setSheet({ kind: "edit-account", account }) },
                  {
                    label: "Ajustar saldo",
                    icon: Scale,
                    onClick: () => setSheet({ kind: "adjust", target: { id: account.id, name: account.name, balance: account.balance } }),
                  },
                  {
                    label: "Excluir",
                    icon: Trash2,
                    danger: true,
                    onClick: () =>
                      setConfirm({
                        title: `Excluir ${account.name}?`,
                        description:
                          "Os lançamentos continuam no extrato, mas passam a contar em “Dinheiro e outros”. Não dá para desfazer.",
                        action: () => apiService.deletePaymentAccount(account.id),
                        success: "Conta excluída",
                      }),
                  },
                ]}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Saldo</p>
            <Money value={account.balance} className="font-display text-2xl font-bold" colored={account.balance < 0} />
            {account.card ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Fatura do cartão: <Money value={account.card.owed} className="font-medium text-expense" />
              </p>
            ) : null}
          </article>
        ))}

        <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <WalletIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">Dinheiro e outros</h3>
                <p className="text-xs text-muted-foreground">Dinheiro vivo, boleto e lançamentos sem conta</p>
              </div>
            </div>
            <RowMenu
              items={[
                {
                  label: "Ajustar saldo",
                  icon: Scale,
                  onClick: () =>
                    setSheet({
                      kind: "adjust",
                      target: { id: "unassigned", name: "Dinheiro e outros", balance: overview.unassigned.balance },
                    }),
                },
              ]}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Saldo</p>
          <Money value={overview.unassigned.balance} className="font-display text-2xl font-bold" colored={overview.unassigned.balance < 0} />
        </article>
      </div>

      {transfers.length > 0 ? (
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <h3 className="mb-2 font-display font-semibold">Transferências e faturas pagas</h3>
          <ul className="divide-y divide-border/60">
            {transfers.map((transfer) => (
              <li key={transfer.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {transfer.kind === "card_payment"
                      ? `Fatura ${transfer.to_account_name ?? ""}`
                      : `${transfer.from_account_name ?? "Dinheiro e outros"} → ${transfer.to_account_name ?? "Dinheiro e outros"}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatShortDate(transfer.date)}
                    {transfer.kind === "card_payment" ? ` · pago com ${transfer.from_account_name ?? "dinheiro e outros"}` : ""}
                    {transfer.description && transfer.kind === "transfer" ? ` · ${transfer.description}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Money value={transfer.amount} className="text-sm font-semibold" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Excluir movimentação"
                    onClick={() =>
                      setConfirm({
                        title: "Excluir movimentação?",
                        description: "Os saldos das contas serão recalculados.",
                        action: () => apiService.deleteTransfer(transfer.id),
                        success: "Movimentação excluída",
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CardsTab({ overview, setSheet }: { overview: FinanceOverview; setSheet: (s: Sheet) => void }) {
  const cards = overview.accounts.filter((account) => account.card);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm">
        <p className="font-semibold">Nenhum cartão de crédito ainda</p>
        <p className="mt-1 text-muted-foreground">
          Em <strong>Contas</strong>, edite (ou crie) a conta do banco e marque “Cartão de crédito”. Informe os dias de fechamento e
          vencimento para o KIP separar a fatura fechada da aberta.
        </p>
        <Button className="mt-4 gap-2" onClick={() => setSheet({ kind: "new-account" })}>
          <Plus className="h-4 w-4" /> Cadastrar cartão
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((account) => {
        const card = account.card!;
        const used = card.credit_limit ? Math.min(100, (Math.max(card.owed, 0) / card.credit_limit) * 100) : null;
        return (
          <article key={account.id} className="flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> {account.name}
              </h3>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Editar cartão" onClick={() => setSheet({ kind: "edit-account", account })}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fatura fechada</dt>
                <dd>
                  <Money value={card.closed_invoice} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Fatura aberta</dt>
                <dd>
                  <Money value={card.open_invoice} className="font-semibold" />
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border/60 pt-2">
                <dt className="font-medium">Total a pagar</dt>
                <dd>
                  <Money value={card.owed} className="font-bold text-expense" />
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              {card.closing_day ? `Fecha dia ${card.closing_day}` : "Sem dia de fechamento"}
              {card.next_due_date ? ` · ${formatDueLabel(card.next_due_date, overview.today)}` : card.due_day ? ` · vence dia ${card.due_day}` : ""}
            </p>
            {used !== null ? (
              <div className="mt-3">
                <Progress value={used} className="h-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Limite disponível <Money value={card.available_limit ?? 0} /> de <Money value={card.credit_limit ?? 0} />
                </p>
              </div>
            ) : null}
            <Button className="mt-4 w-full" onClick={() => setSheet({ kind: "pay-invoice", account })} disabled={card.owed <= 0}>
              Pagar fatura
            </Button>
          </article>
        );
      })}
    </div>
  );
}

function DebtCard({
  debt,
  today,
  setSheet,
  setConfirm,
}: {
  debt: Debt;
  today: string;
  setSheet: (s: Sheet) => void;
  setConfirm: (c: Confirm) => void;
}) {
  const progress = debt.installments_total
    ? (debt.installments_paid / debt.installments_total) * 100
    : debt.amount_due > 0
      ? (debt.paid_amount / debt.amount_due) * 100
      : 0;

  return (
    <article className="flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{debt.name}</h3>
          <p className="text-xs text-muted-foreground">
            {DEBT_KIND_LABELS[debt.kind]}
            {debt.creditor ? ` · ${debt.creditor}` : ""}
          </p>
        </div>
        <RowMenu
          items={[
            { label: "Editar", icon: Pencil, onClick: () => setSheet({ kind: "edit-debt", debt }) },
            ...(debt.settled
              ? []
              : [
                  {
                    label: "Marcar como quitada",
                    icon: CheckCircle2,
                    onClick: () =>
                      setConfirm({
                        title: `Quitar ${debt.name}?`,
                        description: "Ela sai do total de dívidas. Use quando pagou o restante fora do KIP.",
                        action: () => apiService.updateDebt(debt.id, { closed: true }),
                        success: "Dívida quitada",
                      }),
                  },
                ]),
            {
              label: "Excluir",
              icon: Trash2,
              danger: true,
              onClick: () =>
                setConfirm({
                  title: `Excluir ${debt.name}?`,
                  description: "As parcelas já pagas continuam no extrato como gastos.",
                  action: () => apiService.deleteDebt(debt.id),
                  success: "Dívida excluída",
                }),
            },
          ]}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Falta pagar</p>
      <Money value={debt.remaining} className="font-display text-2xl font-bold" />

      <div className="mt-3">
        <Progress value={progress} className="h-1.5" />
        <p className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>
            {debt.installments_total
              ? `${debt.installments_paid} de ${debt.installments_total} parcelas`
              : `${Math.round(progress)}% pago`}
          </span>
          {debt.installment_amount ? (
            <span>
              Parcela <Money value={debt.installment_amount} />
            </span>
          ) : null}
        </p>
      </div>

      {debt.settled ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-income">
          <CheckCircle2 className="h-4 w-4" /> Quitada
        </p>
      ) : (
        <>
          {debt.next_due_date ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Próxima parcela {formatDueLabel(debt.next_due_date, today)}
              {formatDueLabel(debt.next_due_date, today)?.startsWith("vence em")
                ? ` (${format(parseISO(debt.next_due_date), "dd/MM")})`
                : ""}
            </p>
          ) : null}
          <Button className="mt-4 w-full" onClick={() => setSheet({ kind: "pay-debt", debt })}>
            Pagar parcela
          </Button>
        </>
      )}
    </article>
  );
}

function DebtsTab({
  overview,
  setSheet,
  setConfirm,
}: {
  overview: FinanceOverview;
  setSheet: (s: Sheet) => void;
  setConfirm: (c: Confirm) => void;
}) {
  const open = overview.debts.filter((debt) => !debt.settled);
  const settled = overview.debts.filter((debt) => debt.settled);

  return (
    <div className="space-y-4">
      <Button onClick={() => setSheet({ kind: "new-debt" })} className="gap-2">
        <Plus className="h-4 w-4" /> Nova dívida
      </Button>

      {overview.debts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm">
          <p className="font-semibold">Nenhuma dívida cadastrada</p>
          <p className="mt-1 text-muted-foreground">
            Empréstimos, financiamentos e compras parceladas entram aqui. O KIP acompanha as parcelas e desconta do seu patrimônio.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {open.map((debt) => (
          <DebtCard key={debt.id} debt={debt} today={overview.today} setSheet={setSheet} setConfirm={setConfirm} />
        ))}
      </div>

      {settled.length > 0 ? (
        <details className="rounded-2xl border border-border/70 bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Quitadas ({settled.length})</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {settled.map((debt) => (
              <DebtCard key={debt.id} debt={debt} today={overview.today} setSheet={setSheet} setConfirm={setConfirm} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

const SHEET_TITLES: Record<NonNullable<Sheet>["kind"], string> = {
  "new-account": "Nova conta",
  "edit-account": "Editar conta",
  adjust: "Ajustar saldo",
  transfer: "Transferir entre contas",
  "pay-invoice": "Pagar fatura",
  "new-debt": "Nova dívida",
  "edit-debt": "Editar dívida",
  "pay-debt": "Pagar parcela",
};

const Wallet = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("aba") as TabKey) in TABS ? (params.get("aba") as TabKey) : "contas";
  const { data: overview, isLoading } = useOverview();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const { run } = useFinanceAction();

  // atalho vindo de outras telas: /carteira?nova=1
  useEffect(() => {
    if (params.get("nova") === "1") {
      setSheet({ kind: "new-account" });
      params.delete("nova");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const close = () => setSheet(null);

  return (
    <AppShell title="Carteira" subtitle="Contas, cartões e dívidas">
      <main className="container-app flex-1 space-y-4 py-4 sm:py-6">
        {isLoading || !overview ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : (
          <>
            <div className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card py-3 text-center">
              <div className="px-2">
                <p className="text-xs text-muted-foreground">Em contas</p>
                <Money value={overview.cash_total} className="block truncate text-sm font-semibold sm:text-base" />
              </div>
              <div className="px-2">
                <p className="text-xs text-muted-foreground">Faturas</p>
                <Money value={overview.cards_owed} className="block truncate text-sm font-semibold text-expense sm:text-base" />
              </div>
              <div className="px-2">
                <p className="text-xs text-muted-foreground">Dívidas</p>
                <Money value={overview.debts_total} className="block truncate text-sm font-semibold text-expense sm:text-base" />
              </div>
            </div>

            <Tabs value={tab} onValueChange={(value) => setParams({ aba: value }, { replace: true })}>
              <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
                {(Object.keys(TABS) as TabKey[]).map((key) => (
                  <TabsTrigger key={key} value={key} className="gap-1.5">
                    {key === "contas" ? <Landmark className="h-4 w-4" /> : key === "cartoes" ? <CreditCard className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                    {TABS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="contas" className="mt-4">
                <AccountsTab overview={overview} setSheet={setSheet} setConfirm={setConfirm} />
              </TabsContent>
              <TabsContent value="cartoes" className="mt-4">
                <CardsTab overview={overview} setSheet={setSheet} />
              </TabsContent>
              <TabsContent value="dividas" className="mt-4">
                <DebtsTab overview={overview} setSheet={setSheet} setConfirm={setConfirm} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <ResponsiveSheet open={sheet !== null} onOpenChange={(open) => !open && close()} title={sheet ? SHEET_TITLES[sheet.kind] : ""}>
        {sheet?.kind === "new-account" ? <AccountForm onDone={close} /> : null}
        {sheet?.kind === "edit-account" ? <AccountForm account={sheet.account} onDone={close} /> : null}
        {sheet?.kind === "adjust" ? <AdjustBalanceForm target={sheet.target} onDone={close} /> : null}
        {sheet?.kind === "transfer" && overview ? <TransferForm overview={overview} onDone={close} /> : null}
        {sheet?.kind === "pay-invoice" && overview ? <PayInvoiceForm card={sheet.account} overview={overview} onDone={close} /> : null}
        {sheet?.kind === "new-debt" ? <DebtForm onDone={close} /> : null}
        {sheet?.kind === "edit-debt" ? <DebtForm debt={sheet.debt} onDone={close} /> : null}
        {sheet?.kind === "pay-debt" ? <PayDebtForm debt={sheet.debt} onDone={close} /> : null}
      </ResponsiveSheet>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && void run(confirm.action, confirm.success, () => setConfirm(null))}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Wallet;
