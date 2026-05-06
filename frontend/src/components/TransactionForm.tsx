import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionInput, TransactionType } from "@/types/finance";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  clearPendingTransactionAccountId,
  clearTransactionDraft,
  clearTransactionReturnContext,
  loadPendingTransactionAccountId,
  loadTransactionDraft,
  saveTransactionDraft,
  saveTransactionReturnContext,
} from "@/lib/transaction-form-draft";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Landmark,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionFormProps {
  onSubmit: (transaction: TransactionInput) => Promise<void> | void;
}

const NO_CATEGORY_VALUE = "__no_category__";
const CREATE_CATEGORY_VALUE = "__create_category__";
const NO_PAYMENT_METHOD_VALUE = "__no_payment_method__";
const NO_PAYMENT_ACCOUNT_VALUE = "__no_payment_account__";
const CREATE_PAYMENT_ACCOUNT_VALUE = "__create_payment_account__";
const LINK_PAYMENT_ACCOUNT_VALUE = "__link_payment_account__";

function getLocalDateInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(getLocalDateInputValue());
  const { categories, addCategory } = useCategories();
  const { paymentMethods } = usePaymentMethods();

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id.toString() === paymentMethodId,
  );
  const linkedPaymentAccounts = selectedPaymentMethod?.accounts || [];

  useEffect(() => {
    const draft = loadTransactionDraft();

    if (!draft?.open) {
      return;
    }

    setType(draft.type);
    setAmount(draft.amount);
    setDescription(draft.description);
    setCategoryId(draft.categoryId);
    setPaymentMethodId(draft.paymentMethodId);
    setPaymentAccountId(draft.paymentAccountId);
    setDate(draft.date);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    saveTransactionDraft({
      open,
      type,
      amount,
      description,
      categoryId,
      paymentMethodId,
      paymentAccountId,
      date,
    });
  }, [open, type, amount, description, categoryId, paymentMethodId, paymentAccountId, date]);

  useEffect(() => {
    const pendingAccountId = loadPendingTransactionAccountId();

    if (!pendingAccountId || !selectedPaymentMethod) {
      return;
    }

    const hasLinkedAccount = selectedPaymentMethod.accounts.some(
      (account) => account.id.toString() === pendingAccountId,
    );

    if (!hasLinkedAccount) {
      return;
    }

    setPaymentAccountId(pendingAccountId);
    setOpen(true);
    clearPendingTransactionAccountId();
    clearTransactionReturnContext();
  }, [selectedPaymentMethod]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setPaymentMethodId("");
    setPaymentAccountId("");
    setNewCategoryName("");
    setIsCreatingCategory(false);
    setIsSavingCategory(false);
    setDate(getLocalDateInputValue());
    clearTransactionDraft();
    clearTransactionReturnContext();
    clearPendingTransactionAccountId();
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (isSubmitting) {
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      setIsCreatingCategory(false);
      setNewCategoryName("");
      clearTransactionDraft();
      clearTransactionReturnContext();
      clearPendingTransactionAccountId();
    }
  };

  const openPaymentAccountsPage = () => {
    if (!paymentMethodId) {
      toast({
        variant: "destructive",
        title: "Forma de pagamento obrigatoria",
        description: "Selecione primeiro a forma de pagamento da transacao.",
      });
      return;
    }

    saveTransactionDraft({
      open: true,
      type,
      amount,
      description,
      categoryId,
      paymentMethodId,
      paymentAccountId,
      date,
    });

    saveTransactionReturnContext({
      returnPath: location.pathname,
      paymentMethodId,
    });

    navigate("/payment-accounts");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!amount || !description) {
      return;
    }

    if (!paymentMethodId) {
      toast({
        variant: "destructive",
        title: "Forma de pagamento obrigatoria",
        description: "Selecione a forma de pagamento da transacao.",
      });
      return;
    }

    if (selectedPaymentMethod?.accounts_enabled && !paymentAccountId) {
      toast({
        variant: "destructive",
        title: "Conta obrigatoria",
        description:
          "Selecione a conta da forma de pagamento antes de salvar a transacao.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        type,
        amount: parseFloat(amount),
        description,
        category_id: categoryId ? parseInt(categoryId, 10) : undefined,
        payment_method_id: parseInt(paymentMethodId, 10),
        payment_account_id: paymentAccountId
          ? parseInt(paymentAccountId, 10)
          : undefined,
        date,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel salvar a transacao",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Nome obrigatorio",
        description: "Informe um nome para criar a categoria.",
      });
      return;
    }

    try {
      setIsSavingCategory(true);
      const createdCategory = await addCategory(trimmedName);
      setCategoryId(createdCategory.id.toString());
      setNewCategoryName("");
      setIsCreatingCategory(false);
      toast({
        title: "Categoria criada",
        description: `"${createdCategory.name}" ja foi selecionada na transacao.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel criar a categoria",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const formatAmountPreview = () => {
    if (!amount) {
      return "R$ 0,00";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(amount));
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full gap-2 font-semibold btn-primary-glow sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nova Transação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="mx-auto flex max-h-[90vh] w-[95vw] flex-col overflow-hidden p-0 sm:max-w-lg">
        <div
          className={cn(
            "shrink-0 p-6 pb-4 transition-colors duration-300",
            type === "income"
              ? "bg-gradient-to-r from-income/20 to-income/5"
              : "bg-gradient-to-r from-expense/20 to-expense/5",
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-display sm:text-2xl">
              <motion.div
                className={cn(
                  "rounded-xl p-2.5",
                  type === "income"
                    ? "bg-income text-income-foreground"
                    : "bg-expense text-expense-foreground",
                )}
                key={type}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {type === "income" ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </motion.div>
              Adicionar {type === "income" ? "Ganho" : "Gasto"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-6 pt-2"
        >
          <div className="flex gap-2 rounded-xl bg-muted p-1.5">
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300",
                type === "income"
                  ? "bg-income text-income-foreground shadow-lg shadow-income/30"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Ganho</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-300",
                type === "expense"
                  ? "bg-expense text-expense-foreground shadow-lg shadow-expense/30"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              <TrendingDown className="h-4 w-4" />
              Gasto
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Valor
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 border-2 pl-4 pr-4 text-xl font-semibold focus:border-primary/50"
                required
              />
              <AnimatePresence>
                {amount ? (
                  <motion.div
                    className="absolute -bottom-6 left-0 text-sm"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <span
                      className={cn(
                        "font-semibold",
                        type === "income" ? "text-income" : "text-expense",
                      )}
                    >
                      {formatAmountPreview()}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Descrição
            </Label>
            <Input
              id="description"
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12 border-2 focus:border-primary/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Categoria
              </Label>
              <Select
                value={categoryId || NO_CATEGORY_VALUE}
                onValueChange={(value) => {
                  if (value === CREATE_CATEGORY_VALUE) {
                    setIsCreatingCategory(true);
                    return;
                  }

                  if (value === NO_CATEGORY_VALUE) {
                    setCategoryId("");
                    setIsCreatingCategory(false);
                    return;
                  }

                  setCategoryId(value);
                  setIsCreatingCategory(false);
                }}
              >
                <SelectTrigger className="h-12 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={NO_CATEGORY_VALUE}>
                    Sem categoria
                  </SelectItem>
                  <SelectSeparator />
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={CREATE_CATEGORY_VALUE}>
                    Criar nova categoria
                  </SelectItem>
                </SelectContent>
              </Select>

              {isCreatingCategory ? (
                <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      Nova categoria
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateCategory();
                      }
                    }}
                    placeholder="Ex: Academia"
                    className="h-11 border-2 focus:border-primary/50"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isSavingCategory || !newCategoryName.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isSavingCategory ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar categoria
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="paymentMethod"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Forma de Pagamento
              </Label>
              <Select
                value={paymentMethodId || NO_PAYMENT_METHOD_VALUE}
                onValueChange={(value) => {
                  if (value === NO_PAYMENT_METHOD_VALUE) {
                    setPaymentMethodId("");
                    setPaymentAccountId("");
                    return;
                  }

                  setPaymentMethodId(value);
                  setPaymentAccountId("");
                }}
              >
                <SelectTrigger className="h-12 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Selecione a forma" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={NO_PAYMENT_METHOD_VALUE}>
                    Selecione a forma
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPaymentMethod?.accounts_enabled ? (
            <div className="space-y-2">
              <Label
                htmlFor="paymentAccount"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Landmark className="h-4 w-4 text-muted-foreground" />
                Conta da Forma de Pagamento
              </Label>
              <Select
                value={paymentAccountId || NO_PAYMENT_ACCOUNT_VALUE}
                onValueChange={(value) => {
                  if (
                    value === CREATE_PAYMENT_ACCOUNT_VALUE ||
                    value === LINK_PAYMENT_ACCOUNT_VALUE
                  ) {
                    setPaymentAccountId("");
                    openPaymentAccountsPage();
                    return;
                  }

                  if (value === NO_PAYMENT_ACCOUNT_VALUE) {
                    setPaymentAccountId("");
                    return;
                  }

                  setPaymentAccountId(value);
                }}
              >
                <SelectTrigger className="h-12 border-2 focus:border-primary/50">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={NO_PAYMENT_ACCOUNT_VALUE}>
                    Selecione a conta
                  </SelectItem>
                  {linkedPaymentAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={CREATE_PAYMENT_ACCOUNT_VALUE}>
                    Criar nova conta
                  </SelectItem>
                  <SelectItem value={LINK_PAYMENT_ACCOUNT_VALUE}>
                    Vincular conta existente
                  </SelectItem>
                </SelectContent>
              </Select>
              {linkedPaymentAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma conta vinculada para esta forma.
                </p>
              ) : null}
            </div>
          ) : selectedPaymentMethod ? (
            <p className="text-xs text-muted-foreground">
              {selectedPaymentMethod.name} não exige conta vinculada.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 border-2 focus:border-primary/50"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSavingCategory || isSubmitting}
            className={cn(
              "h-12 w-full text-base font-semibold transition-all duration-300",
              type === "income"
                ? "bg-income hover:bg-income/90 income-glow"
                : "bg-expense hover:bg-expense/90 expense-glow",
            )}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Adicionar {type === "income" ? "Ganho" : "Gasto"}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
