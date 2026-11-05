import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
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
import { Chip, ChipGroup, FieldLabel } from "@/components/entry/Chip";
import { apiService } from "@/services/api";
import { financeKeys, useCategoryList, usePaymentSetup } from "@/hooks/useFinanceData";
import { notifyDataChanged } from "@/lib/data-events";
import { formatCurrency, parseMoneyInput, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/finance";

const LAST_PAYMENT_KEY = "kip:last-payment";
const VISIBLE_CATEGORIES = 8;

type EntryFormProps = {
  transaction?: Transaction;
  initialType?: TransactionType;
  onDone: () => void;
};

type LastPayment = { methodId: number; accountId: number | null };

function loadLastPayment(type: TransactionType): LastPayment | null {
  try {
    const all = JSON.parse(localStorage.getItem(LAST_PAYMENT_KEY) || "{}");
    return all[type] ?? null;
  } catch {
    return null;
  }
}

function saveLastPayment(type: TransactionType, value: LastPayment) {
  try {
    const all = JSON.parse(localStorage.getItem(LAST_PAYMENT_KEY) || "{}");
    localStorage.setItem(LAST_PAYMENT_KEY, JSON.stringify({ ...all, [type]: value }));
  } catch {
    // armazenamento indisponivel: so nao lembra a ultima escolha
  }
}

export function EntryForm({ transaction, initialType = "expense", onDone }: EntryFormProps) {
  const isEditing = Boolean(transaction);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategoryList();
  const { data: paymentSetup, isLoading: isLoadingPayments } = usePaymentSetup();
  const methods = useMemo(() => paymentSetup?.methods ?? [], [paymentSetup]);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType);
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount).replace(".", ",") : "",
  );
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(transaction?.category_id ?? null);
  const [methodId, setMethodId] = useState<number | null>(transaction?.payment_method_id ?? null);
  const [accountId, setAccountId] = useState<number | null>(transaction?.payment_account_id ?? null);
  const [date, setDate] = useState(transaction?.date?.slice(0, 10) ?? todayIso());
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // metodos possiveis para o tipo (credito nao recebe dinheiro)
  const availableMethods = useMemo(
    () => methods.filter((method) => type === "expense" || !method.is_credit),
    [methods, type],
  );
  const selectedMethod = methods.find((method) => method.id === methodId) ?? null;
  const methodAccounts = useMemo(() => selectedMethod?.accounts ?? [], [selectedMethod]);

  // sugere a ultima forma/conta usada para este tipo
  useEffect(() => {
    if (isEditing || methodId || methods.length === 0) return;
    const last = loadLastPayment(type);
    const method = last && availableMethods.find((item) => item.id === last.methodId);
    if (method) {
      setMethodId(method.id);
      if (last.accountId && method.accounts.some((account) => account.id === last.accountId)) {
        setAccountId(last.accountId);
      }
    }
  }, [availableMethods, isEditing, methodId, methods.length, type]);

  // conta unica: seleciona sozinha
  useEffect(() => {
    if (selectedMethod?.accounts_enabled && methodAccounts.length === 1 && !accountId) {
      setAccountId(methodAccounts[0].id);
    }
  }, [accountId, methodAccounts, selectedMethod]);

  useEffect(() => {
    if (!isEditing && window.matchMedia("(min-width: 768px)").matches) {
      amountRef.current?.focus();
    }
  }, [isEditing]);

  const switchType = (next: TransactionType) => {
    setType(next);
    if (next === "income" && selectedMethod?.is_credit) {
      setMethodId(null);
      setAccountId(null);
    }
  };

  const chooseMethod = (id: number) => {
    setMethodId(id);
    setAccountId(null);
  };

  const parsedAmount = parseMoneyInput(amount);
  const sortedCategories = useMemo(() => {
    const list = [...categories];
    // categoria atual sempre visivel
    if (categoryId) {
      const index = list.findIndex((category) => category.id === categoryId);
      if (index >= VISIBLE_CATEGORIES) list.unshift(...list.splice(index, 1));
    }
    return list;
  }, [categories, categoryId]);
  const visibleCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, VISIBLE_CATEGORIES);

  const today = todayIso();
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const tone = type === "income" ? "income" : "expense";

  const missing = !(parsedAmount > 0)
    ? "Informe o valor"
    : !description.trim()
      ? "Descreva o lançamento"
      : !selectedMethod
        ? type === "income"
          ? "Escolha como recebeu"
          : "Escolha como pagou"
        : selectedMethod.accounts_enabled && !accountId
          ? "Escolha a conta"
          : null;

  const refreshAll = async () => {
    notifyDataChanged();
    await queryClient.invalidateQueries({ queryKey: ["finance"] });
  };

  const handleCreateCategory = async () => {
    const name = newCategory?.trim();
    if (!name) return;
    try {
      const response = await apiService.createCategory(name);
      await queryClient.invalidateQueries({ queryKey: financeKeys.categories });
      setCategoryId(response.category.id);
      setNewCategory(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível criar a categoria",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (missing || isSaving || !selectedMethod) {
      if (missing) toast({ variant: "destructive", title: missing });
      return;
    }

    const payload = {
      type,
      amount: Math.round(parsedAmount * 100) / 100,
      description: description.trim(),
      category_id: categoryId ?? undefined,
      payment_method_id: selectedMethod.id,
      payment_account_id: selectedMethod.accounts_enabled ? accountId ?? undefined : undefined,
      date,
    };

    try {
      setIsSaving(true);
      if (transaction) {
        await apiService.updateEntry(transaction.id, { ...payload, category_id: categoryId ?? null });
      } else {
        await apiService.createEntry(payload);
      }
      saveLastPayment(type, { methodId: selectedMethod.id, accountId: payload.payment_account_id ?? null });
      await refreshAll();
      toast({
        title: isEditing ? "Lançamento atualizado" : type === "income" ? "Ganho registrado" : "Gasto registrado",
        description: `${description.trim()} · ${formatCurrency(payload.amount)}`,
      });
      onDone();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      setIsSaving(true);
      await apiService.deleteEntry(transaction.id);
      await refreshAll();
      toast({ title: "Lançamento excluído", description: transaction.description });
      onDone();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível excluir",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const creditAccount = selectedMethod?.is_credit
    ? methodAccounts.find((account) => account.id === accountId)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-1">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Tipo">
        {(["expense", "income"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={type === option}
            onClick={() => switchType(option)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition-colors",
              type === option
                ? option === "expense"
                  ? "bg-expense text-expense-foreground shadow"
                  : "bg-income text-income-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option === "expense" ? "Gasto" : "Ganho"}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="entry-amount" className="sr-only">
          Valor
        </label>
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border-2 px-4 py-2 focus-within:border-primary",
            type === "income" ? "border-income/30" : "border-expense/30",
          )}
        >
          <span className="text-lg font-semibold text-muted-foreground">R$</span>
          <input
            id="entry-amount"
            ref={amountRef}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ""))}
            className={cn(
              "h-12 w-full min-w-0 bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40",
              type === "income" ? "text-income" : "text-expense",
            )}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Descrição</FieldLabel>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={type === "income" ? "Ex.: Salário, freela, Pix recebido" : "Ex.: Mercado, Uber, aluguel"}
          maxLength={255}
          className="h-11"
        />
      </div>

      <div>
        <FieldLabel hint="opcional">Categoria</FieldLabel>
        <ChipGroup>
          {visibleCategories.map((category) => (
            <Chip
              key={category.id}
              tone={tone}
              selected={categoryId === category.id}
              onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
            >
              {category.name}
            </Chip>
          ))}
          {sortedCategories.length > VISIBLE_CATEGORIES ? (
            <Chip onClick={() => setShowAllCategories((value) => !value)} className="border-dashed">
              {showAllCategories ? "Menos" : `+${sortedCategories.length - VISIBLE_CATEGORIES}`}
            </Chip>
          ) : null}
          {newCategory === null ? (
            <Chip onClick={() => setNewCategory("")} className="border-dashed text-muted-foreground">
              <Plus className="h-3.5 w-3.5" /> Nova
            </Chip>
          ) : null}
        </ChipGroup>
        {newCategory !== null ? (
          <div className="mt-2 flex gap-2">
            <Input
              autoFocus
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateCategory();
                }
              }}
              placeholder="Nome da categoria"
              maxLength={50}
              className="h-10"
            />
            <Button type="button" variant="secondary" onClick={() => void handleCreateCategory()}>
              Criar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setNewCategory(null)}>
              Cancelar
            </Button>
          </div>
        ) : null}
      </div>

      <div>
        <FieldLabel>{type === "income" ? "Como recebeu" : "Como pagou"}</FieldLabel>
        {isLoadingPayments ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ChipGroup>
            {availableMethods.map((method) => (
              <Chip key={method.id} tone={tone} selected={methodId === method.id} onClick={() => chooseMethod(method.id)}>
                {method.name}
              </Chip>
            ))}
          </ChipGroup>
        )}
      </div>

      {selectedMethod?.accounts_enabled ? (
        <div>
          <FieldLabel>{selectedMethod.is_credit ? "Qual cartão" : "Qual conta"}</FieldLabel>
          {methodAccounts.length > 0 ? (
            <ChipGroup>
              {methodAccounts.map((account) => (
                <Chip key={account.id} tone={tone} selected={accountId === account.id} onClick={() => setAccountId(account.id)}>
                  {account.name}
                </Chip>
              ))}
            </ChipGroup>
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
              Nenhuma conta usa {selectedMethod.name} ainda.{" "}
              <Link to="/carteira?nova=1" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={onDone}>
                Cadastrar conta
              </Link>
            </p>
          )}
          {creditAccount ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Vai para a fatura do cartão {creditAccount.name}. O saldo da conta só muda quando você pagar a fatura.
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <FieldLabel>Data</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={tone} selected={date === today} onClick={() => setDate(today)}>
            Hoje
          </Chip>
          <Chip tone={tone} selected={date === yesterday} onClick={() => setDate(yesterday)}>
            Ontem
          </Chip>
          <Input
            type="date"
            aria-label="Outra data"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className={cn("h-9 w-auto rounded-full", date !== today && date !== yesterday && "border-primary")}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-background px-1 pb-1 pt-3 md:static md:bg-transparent">
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={isSaving}
            aria-label="Excluir lançamento"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        ) : null}
        <Button
          type="submit"
          size="lg"
          disabled={isSaving}
          className={cn(
            "h-12 flex-1 text-base font-semibold",
            type === "income" ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90",
          )}
        >
          {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isEditing ? "Salvar alterações" : type === "income" ? "Salvar ganho" : "Salvar gasto"}
        </Button>
      </div>
      {missing && amount ? <p className="-mt-2 text-center text-xs text-muted-foreground">{missing}</p> : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              “{transaction?.description}” será removido e os saldos serão recalculados. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
