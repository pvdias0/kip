import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, subDays } from "date-fns";

import { Chip, ChipGroup, FieldLabel } from "@/components/entry/Chip";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { DayInput, Field, MoneyInput, SubmitButton, toNumberOrNull, useFinanceAction } from "@/components/wallet/fields";
import { Money } from "@/components/finance/Money";
import { usePaymentSetup } from "@/hooks/useFinanceData";
import { apiService } from "@/services/api";
import { formatCurrency, parseMoneyInput, todayIso } from "@/lib/format";
import type { AccountOverview, Debt, DebtKind, FinanceOverview } from "@/types/finance";

const money = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value).replace(".", ",");

function requireAmount(raw: string, label = "Informe o valor") {
  const value = parseMoneyInput(raw);
  if (!(value > 0)) {
    toast({ variant: "destructive", title: label });
    return null;
  }
  return Math.round(value * 100) / 100;
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = todayIso();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip selected={value === today} onClick={() => onChange(today)}>
        Hoje
      </Chip>
      <Chip selected={value === yesterday} onClick={() => onChange(yesterday)}>
        Ontem
      </Chip>
      <Input
        type="date"
        aria-label="Outra data"
        value={value}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="h-9 w-auto rounded-full"
      />
    </div>
  );
}

/** Escolha de conta de origem/destino ("Dinheiro e outros" = sem conta). */
function AccountChoice({
  accounts,
  value,
  onChange,
  exclude,
  allowNone = true,
}: {
  accounts: AccountOverview[];
  value: number | null;
  onChange: (id: number | null) => void;
  exclude?: number | null;
  allowNone?: boolean;
}) {
  return (
    <ChipGroup>
      {accounts
        .filter((account) => account.id !== exclude)
        .map((account) => (
          <Chip key={account.id} selected={value === account.id} onClick={() => onChange(account.id)}>
            {account.name}
          </Chip>
        ))}
      {allowNone ? (
        <Chip selected={value === null} onClick={() => onChange(null)}>
          Dinheiro e outros
        </Chip>
      ) : null}
    </ChipGroup>
  );
}

// ---------------- conta ----------------

export function AccountForm({ account, onDone }: { account?: AccountOverview; onDone: () => void }) {
  const { data: setup } = usePaymentSetup();
  const linkable = useMemo(() => (setup?.methods ?? []).filter((method) => method.accounts_enabled), [setup]);
  const { run, isRunning } = useFinanceAction();

  const [name, setName] = useState(account?.name ?? "");
  const [balance, setBalance] = useState("");
  const [methodIds, setMethodIds] = useState<number[]>(account?.payment_method_ids ?? []);
  const [limit, setLimit] = useState(money(account?.card?.credit_limit));
  const [closingDay, setClosingDay] = useState(account?.card?.closing_day ? String(account.card.closing_day) : "");
  const [dueDay, setDueDay] = useState(account?.card?.due_day ? String(account.card.due_day) : "");

  // conta nova: ja marca debito e pix
  useEffect(() => {
    if (!account && methodIds.length === 0 && linkable.length > 0) {
      setMethodIds(linkable.filter((m) => !m.is_credit).map((m) => m.id));
    }
  }, [account, linkable, methodIds.length]);

  const hasCredit = linkable.some((m) => m.is_credit && methodIds.includes(m.id));
  const toggle = (id: number) =>
    setMethodIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Dê um nome para a conta" });
      return;
    }
    const card = hasCredit
      ? {
          credit_limit: limit.trim() ? parseMoneyInput(limit) : null,
          closing_day: toNumberOrNull(closingDay),
          due_day: toNumberOrNull(dueDay),
        }
      : { credit_limit: null, closing_day: null, due_day: null };

    void run(
      () =>
        account
          ? apiService.updateAccount(account.id, { name: name.trim(), payment_method_ids: methodIds, ...card })
          : apiService.createAccount({
              name: name.trim(),
              payment_method_ids: methodIds,
              current_balance: balance.trim() ? parseMoneyInput(balance) || 0 : 0,
              ...card,
            }),
      account ? "Conta atualizada" : "Conta criada",
      onDone,
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <Field label="Nome" htmlFor="account-name">
        <Input
          id="account-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Nubank, Itaú, Caixa"
          maxLength={120}
          className="h-11"
          autoFocus={!account}
        />
      </Field>

      {!account ? (
        <Field label="Quanto tem nela hoje?" htmlFor="account-balance" hint="Pode deixar em branco e ajustar depois.">
          <MoneyInput id="account-balance" value={balance} onChange={setBalance} allowNegative />
        </Field>
      ) : null}

      <div>
        <FieldLabel hint="toque para marcar">O que você usa dessa conta?</FieldLabel>
        <ChipGroup>
          {linkable.map((method) => (
            <Chip key={method.id} selected={methodIds.includes(method.id)} onClick={() => toggle(method.id)}>
              {method.is_credit ? "Cartão de crédito" : method.name}
            </Chip>
          ))}
        </ChipGroup>
        <p className="mt-2 text-xs text-muted-foreground">
          Elas aparecem como opção quando você lança um gasto com essa forma de pagamento.
        </p>
      </div>

      {hasCredit ? (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-semibold">Cartão de crédito</p>
          <Field label="Limite" htmlFor="card-limit" hint="Opcional">
            <MoneyInput id="card-limit" value={limit} onChange={setLimit} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha dia" htmlFor="card-closing">
              <DayInput id="card-closing" value={closingDay} onChange={setClosingDay} />
            </Field>
            <Field label="Vence dia" htmlFor="card-due">
              <DayInput id="card-due" value={dueDay} onChange={setDueDay} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Compras no crédito vão para a fatura e só saem do saldo quando você paga a fatura.
          </p>
        </div>
      ) : null}

      <SubmitButton isRunning={isRunning}>{account ? "Salvar conta" : "Criar conta"}</SubmitButton>
    </form>
  );
}

// ---------------- ajustar saldo ----------------

export function AdjustBalanceForm({
  target,
  onDone,
}: {
  target: { id: number | "unassigned"; name: string; balance: number };
  onDone: () => void;
}) {
  const [value, setValue] = useState(money(target.balance));
  const { run, isRunning } = useFinanceAction();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseMoneyInput(value);
    if (!Number.isFinite(parsed)) {
      toast({ variant: "destructive", title: "Informe o saldo" });
      return;
    }
    void run(() => apiService.adjustAccountBalance(target.id, parsed), "Saldo ajustado", onDone);
  };

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <p className="text-sm text-muted-foreground">
        Hoje o KIP calcula <strong className="text-foreground">{formatCurrency(target.balance)}</strong> em {target.name}. Se o
        valor real for outro, informe abaixo: o KIP corrige o saldo sem criar lançamento.
      </p>
      <Field label="Saldo real hoje" htmlFor="adjust-balance">
        <MoneyInput id="adjust-balance" value={value} onChange={setValue} allowNegative autoFocus />
      </Field>
      <SubmitButton isRunning={isRunning}>Ajustar saldo</SubmitButton>
    </form>
  );
}

// ---------------- pagar fatura ----------------

export function PayInvoiceForm({
  card,
  overview,
  onDone,
}: {
  card: AccountOverview;
  overview: FinanceOverview;
  onDone: () => void;
}) {
  const suggested = card.card?.closed_invoice || card.card?.owed || 0;
  const [amount, setAmount] = useState(money(suggested > 0 ? suggested : null));
  const [fromId, setFromId] = useState<number | null>(card.has_debit ? card.id : overview.accounts[0]?.id ?? null);
  const [date, setDate] = useState(todayIso());
  const { run, isRunning } = useFinanceAction();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = requireAmount(amount);
    if (value === null) return;
    void run(
      () =>
        apiService.createTransfer({
          kind: "card_payment",
          amount: value,
          date,
          from_account_id: fromId,
          to_account_id: card.id,
          description: `Fatura ${card.name}`,
        }),
      "Pagamento da fatura registrado",
      onDone,
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <div className="rounded-2xl bg-muted/50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fatura fechada</span>
          <Money value={card.card?.closed_invoice ?? 0} className="font-semibold" />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total no cartão</span>
          <Money value={card.card?.owed ?? 0} className="font-semibold" />
        </div>
      </div>
      <Field label="Valor pago" htmlFor="invoice-amount">
        <MoneyInput id="invoice-amount" value={amount} onChange={setAmount} />
      </Field>
      <div>
        <FieldLabel>Pago com o dinheiro de</FieldLabel>
        <AccountChoice accounts={overview.accounts} value={fromId} onChange={setFromId} />
      </div>
      <div>
        <FieldLabel>Data</FieldLabel>
        <DatePicker value={date} onChange={setDate} />
      </div>
      <p className="text-xs text-muted-foreground">
        Pagar a fatura não conta como gasto de novo: as compras já foram contadas quando você lançou.
      </p>
      <SubmitButton isRunning={isRunning}>Registrar pagamento</SubmitButton>
    </form>
  );
}

// ---------------- transferencia ----------------

export function TransferForm({ overview, onDone }: { overview: FinanceOverview; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState<number | null>(overview.accounts[0]?.id ?? null);
  const [toId, setToId] = useState<number | null>(overview.accounts[1]?.id ?? null);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const { run, isRunning } = useFinanceAction();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = requireAmount(amount);
    if (value === null) return;
    if (fromId === toId) {
      toast({ variant: "destructive", title: "Escolha contas diferentes" });
      return;
    }
    void run(
      () =>
        apiService.createTransfer({
          kind: "transfer",
          amount: value,
          date,
          from_account_id: fromId,
          to_account_id: toId,
          description: description.trim() || undefined,
        }),
      "Transferência registrada",
      onDone,
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <Field label="Valor" htmlFor="transfer-amount">
        <MoneyInput id="transfer-amount" value={amount} onChange={setAmount} autoFocus />
      </Field>
      <div>
        <FieldLabel>De</FieldLabel>
        <AccountChoice accounts={overview.accounts} value={fromId} onChange={setFromId} />
      </div>
      <div>
        <FieldLabel>Para</FieldLabel>
        <AccountChoice accounts={overview.accounts} value={toId} onChange={setToId} exclude={fromId} />
      </div>
      <div>
        <FieldLabel>Data</FieldLabel>
        <DatePicker value={date} onChange={setDate} />
      </div>
      <Field label="Descrição" htmlFor="transfer-description" hint="Opcional">
        <Input
          id="transfer-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: Reserva de emergência"
          className="h-11"
        />
      </Field>
      <p className="text-xs text-muted-foreground">Transferências mudam o saldo das contas, mas não contam como ganho nem gasto.</p>
      <SubmitButton isRunning={isRunning}>Transferir</SubmitButton>
    </form>
  );
}

// ---------------- divida ----------------

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  loan: "Empréstimo",
  financing: "Financiamento",
  installment: "Compra parcelada",
  other: "Outra",
};

export function DebtForm({ debt, onDone }: { debt?: Debt; onDone: () => void }) {
  const [name, setName] = useState(debt?.name ?? "");
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? "loan");
  const [creditor, setCreditor] = useState(debt?.creditor ?? "");
  const [amountDue, setAmountDue] = useState(money(debt?.amount_due));
  const [installmentAmount, setInstallmentAmount] = useState(money(debt?.installment_amount));
  const [installmentsTotal, setInstallmentsTotal] = useState(debt?.installments_total ? String(debt.installments_total) : "");
  const [paidBefore, setPaidBefore] = useState(debt ? String(debt.installments_paid_before) : "");
  const [dueDay, setDueDay] = useState(debt?.due_day ? String(debt.due_day) : "");
  const { run, isRunning } = useFinanceAction();

  // preenche o total a partir das parcelas restantes
  const total = toNumberOrNull(installmentsTotal);
  const paid = toNumberOrNull(paidBefore) ?? 0;
  const perInstallment = parseMoneyInput(installmentAmount);
  const suggestedDue = total && perInstallment > 0 && total > paid ? (total - paid) * perInstallment : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Dê um nome para a dívida" });
      return;
    }
    const due = amountDue.trim() ? requireAmount(amountDue, "Informe quanto falta pagar") : suggestedDue;
    if (!due) {
      toast({ variant: "destructive", title: "Informe quanto falta pagar" });
      return;
    }
    const payload = {
      name: name.trim(),
      kind,
      creditor: creditor.trim() || null,
      amount_due: due,
      installment_amount: perInstallment > 0 ? perInstallment : null,
      installments_total: total,
      installments_paid_before: paid,
      due_day: toNumberOrNull(dueDay),
    };
    void run(
      () => (debt ? apiService.updateDebt(debt.id, payload) : apiService.createDebt(payload)),
      debt ? "Dívida atualizada" : "Dívida cadastrada",
      onDone,
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <div>
        <FieldLabel>Tipo</FieldLabel>
        <ChipGroup>
          {(Object.keys(DEBT_KIND_LABELS) as DebtKind[]).map((option) => (
            <Chip key={option} selected={kind === option} onClick={() => setKind(option)}>
              {DEBT_KIND_LABELS[option]}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="debt-name">
          <Input
            id="debt-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Financiamento do carro"
            maxLength={120}
            className="h-11"
          />
        </Field>
        <Field label="Com quem" htmlFor="debt-creditor" hint="Opcional">
          <Input
            id="debt-creditor"
            value={creditor}
            onChange={(event) => setCreditor(event.target.value)}
            placeholder="Banco, loja, pessoa"
            maxLength={120}
            className="h-11"
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
        <p className="text-sm font-semibold">Parcelas <span className="font-normal text-muted-foreground">(se tiver)</span></p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Total" htmlFor="debt-total">
            <Input
              id="debt-total"
              inputMode="numeric"
              value={installmentsTotal}
              onChange={(event) => setInstallmentsTotal(event.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="36"
              className="h-11"
            />
          </Field>
          <Field label="Já pagas" htmlFor="debt-paid">
            <Input
              id="debt-paid"
              inputMode="numeric"
              value={paidBefore}
              onChange={(event) => setPaidBefore(event.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="0"
              className="h-11"
            />
          </Field>
          <Field label="Vence dia" htmlFor="debt-due">
            <DayInput id="debt-due" value={dueDay} onChange={setDueDay} />
          </Field>
        </div>
        <Field label="Valor da parcela" htmlFor="debt-installment">
          <MoneyInput id="debt-installment" value={installmentAmount} onChange={setInstallmentAmount} />
        </Field>
      </div>

      <Field
        label="Quanto falta pagar"
        htmlFor="debt-due-amount"
        hint={
          suggestedDue && !amountDue.trim()
            ? `Se deixar em branco, usamos ${formatCurrency(suggestedDue)} (parcelas restantes × valor).`
            : "O saldo devedor de hoje. Ele diminui a cada parcela paga."
        }
      >
        <MoneyInput id="debt-due-amount" value={amountDue} onChange={setAmountDue} />
      </Field>

      <SubmitButton isRunning={isRunning}>{debt ? "Salvar dívida" : "Cadastrar dívida"}</SubmitButton>
    </form>
  );
}

// ---------------- pagar parcela ----------------

export function PayDebtForm({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const { data: setup } = usePaymentSetup();
  const methods = (setup?.methods ?? []).filter((method) => !method.is_credit);
  const [amount, setAmount] = useState(money(debt.installment_amount ?? debt.remaining));
  const [methodId, setMethodId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(todayIso());
  const { run, isRunning } = useFinanceAction();
  const method = methods.find((item) => item.id === methodId);

  useEffect(() => {
    if (method?.accounts_enabled && method.accounts.length === 1) setAccountId(method.accounts[0].id);
  }, [method]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = requireAmount(amount);
    if (value === null) return;
    if (!method) {
      toast({ variant: "destructive", title: "Escolha como pagou" });
      return;
    }
    if (method.accounts_enabled && !accountId) {
      toast({ variant: "destructive", title: "Escolha a conta" });
      return;
    }
    void run(
      () =>
        apiService.payDebt(debt.id, {
          amount: value,
          date,
          payment_method_id: method.id,
          payment_account_id: method.accounts_enabled ? accountId : null,
        }),
      "Parcela registrada",
      onDone,
    );
  };

  const next = debt.installments_total ? Math.min(debt.installments_paid + 1, debt.installments_total) : null;

  return (
    <form onSubmit={submit} className="space-y-5 pt-1">
      <p className="text-sm text-muted-foreground">
        {next ? `Parcela ${next} de ${debt.installments_total}. ` : ""}Falta pagar{" "}
        <strong className="text-foreground">{formatCurrency(debt.remaining)}</strong>. O pagamento entra no extrato como gasto.
      </p>
      <Field label="Valor" htmlFor="pay-debt-amount">
        <MoneyInput id="pay-debt-amount" value={amount} onChange={setAmount} />
      </Field>
      <div>
        <FieldLabel>Como pagou</FieldLabel>
        <ChipGroup>
          {methods.map((item) => (
            <Chip
              key={item.id}
              selected={methodId === item.id}
              onClick={() => {
                setMethodId(item.id);
                setAccountId(null);
              }}
            >
              {item.name}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      {method?.accounts_enabled ? (
        <div>
          <FieldLabel>Qual conta</FieldLabel>
          {method.accounts.length ? (
            <ChipGroup>
              {method.accounts.map((account) => (
                <Chip key={account.id} selected={accountId === account.id} onClick={() => setAccountId(account.id)}>
                  {account.name}
                </Chip>
              ))}
            </ChipGroup>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma conta usa {method.name}. Cadastre na aba Contas.</p>
          )}
        </div>
      ) : null}
      <div>
        <FieldLabel>Data</FieldLabel>
        <DatePicker value={date} onChange={setDate} />
      </div>
      <SubmitButton isRunning={isRunning}>Registrar pagamento</SubmitButton>
    </form>
  );
}
