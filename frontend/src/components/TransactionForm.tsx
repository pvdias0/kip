import { useState, type FormEvent } from "react";
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
import {
  Plus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Landmark,
  Link2,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionFormProps {
  onSubmit: (transaction: TransactionInput) => void;
}

const NO_CATEGORY_VALUE = "__no_category__";
const CREATE_CATEGORY_VALUE = "__create_category__";
const NO_PAYMENT_METHOD_VALUE = "__no_payment_method__";
const NO_PAYMENT_ACCOUNT_VALUE = "__no_payment_account__";
const CREATE_PAYMENT_ACCOUNT_VALUE = "__create_payment_account__";
const LINK_PAYMENT_ACCOUNT_VALUE = "__link_payment_account__";

export function TransactionForm({ onSubmit }: TransactionFormProps) {
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
  const [isCreatingPaymentAccount, setIsCreatingPaymentAccount] = useState(false);
  const [isLinkingPaymentAccount, setIsLinkingPaymentAccount] = useState(false);
  const [newPaymentAccountName, setNewPaymentAccountName] = useState("");
  const [existingPaymentAccountIdToLink, setExistingPaymentAccountIdToLink] =
    useState("");
  const [isSavingPaymentAccount, setIsSavingPaymentAccount] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { categories, addCategory } = useCategories();
  const {
    paymentMethods,
    paymentAccounts,
    addPaymentAccount,
    linkPaymentAccount,
  } = usePaymentMethods();

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setPaymentMethodId("");
    setPaymentAccountId("");
    setNewCategoryName("");
    setNewPaymentAccountName("");
    setExistingPaymentAccountIdToLink("");
    setIsCreatingCategory(false);
    setIsCreatingPaymentAccount(false);
    setIsLinkingPaymentAccount(false);
    setIsSavingCategory(false);
    setIsSavingPaymentAccount(false);
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setIsCreatingPaymentAccount(false);
      setIsLinkingPaymentAccount(false);
      setNewPaymentAccountName("");
      setExistingPaymentAccountIdToLink("");
    }
  };

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id.toString() === paymentMethodId,
  );
  const linkedPaymentAccounts = selectedPaymentMethod?.accounts || [];
  const availablePaymentAccountsToLink = paymentAccounts.filter(
    (account) =>
      !linkedPaymentAccounts.some((linkedAccount) => linkedAccount.id === account.id),
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!amount || !description) return;

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

    onSubmit({
      type,
      amount: parseFloat(amount),
      description,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      payment_method_id: parseInt(paymentMethodId, 10),
      payment_account_id: paymentAccountId
        ? parseInt(paymentAccountId, 10)
        : undefined,
      date,
    });

    resetForm();
    setOpen(false);
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

  const handleCreatePaymentAccount = async () => {
    const trimmedName = newPaymentAccountName.trim();

    if (!trimmedName || !selectedPaymentMethod) {
      toast({
        variant: "destructive",
        title: "Conta invalida",
        description: "Informe um nome e selecione uma forma de pagamento.",
      });
      return;
    }

    try {
      setIsSavingPaymentAccount(true);
      const createdAccount = await addPaymentAccount(trimmedName);
      await linkPaymentAccount(selectedPaymentMethod.id, createdAccount.id);
      setPaymentAccountId(createdAccount.id.toString());
      setNewPaymentAccountName("");
      setIsCreatingPaymentAccount(false);
      toast({
        title: "Conta criada",
        description: `"${createdAccount.name}" foi vinculada e selecionada.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel criar a conta",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSavingPaymentAccount(false);
    }
  };

  const handleLinkExistingPaymentAccount = async () => {
    if (!selectedPaymentMethod || !existingPaymentAccountIdToLink) {
      toast({
        variant: "destructive",
        title: "Selecione uma conta",
        description: "Escolha uma conta existente para vincular.",
      });
      return;
    }

    try {
      setIsSavingPaymentAccount(true);
      await linkPaymentAccount(
        selectedPaymentMethod.id,
        parseInt(existingPaymentAccountIdToLink, 10),
      );
      setPaymentAccountId(existingPaymentAccountIdToLink);
      setExistingPaymentAccountIdToLink("");
      setIsLinkingPaymentAccount(false);
      toast({
        title: "Conta vinculada",
        description: "A conta foi vinculada e selecionada na transacao.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Nao foi possivel vincular a conta",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsSavingPaymentAccount(false);
    }
  };

  const formatAmountPreview = () => {
    if (!amount) return "R$ 0,00";
    const num = parseFloat(amount);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
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
      <DialogContent className="w-[95vw] sm:max-w-lg mx-auto p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={cn(
          "p-6 pb-4 transition-colors duration-300",
          type === "income"
            ? "bg-gradient-to-r from-income/20 to-income/5"
            : "bg-gradient-to-r from-expense/20 to-expense/5"
        )}>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-display flex items-center gap-3">
              <motion.div
                className={cn(
                  "p-2.5 rounded-xl",
                  type === "income"
                    ? "bg-income text-income-foreground"
                    : "bg-expense text-expense-foreground"
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

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1.5 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
                type === "income"
                  ? "bg-income text-income-foreground shadow-lg shadow-income/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
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
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300",
                type === "expense"
                  ? "bg-expense text-expense-foreground shadow-lg shadow-expense/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <TrendingDown className="h-4 w-4" />
              Gasto
            </button>
          </div>

          {/* Amount with Preview */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
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
                className="h-14 text-xl font-semibold pl-4 pr-4 border-2 focus:border-primary/50"
                required
              />
              <AnimatePresence>
                {amount && (
                  <motion.div
                    className="absolute -bottom-6 left-0 text-sm"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <span className={cn(
                      "font-semibold",
                      type === "income" ? "text-income" : "text-expense"
                    )}>
                      {formatAmountPreview()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
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

          {/* Category, Payment Method & Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Categoria
              </Label>
              <Select
                value={categoryId || NO_CATEGORY_VALUE}
                onValueChange={(val) => {
                  if (val === CREATE_CATEGORY_VALUE) {
                    setIsCreatingCategory(true);
                    return;
                  }

                  if (val === NO_CATEGORY_VALUE) {
                    setCategoryId("");
                    setIsCreatingCategory(false);
                    return;
                  }

                  setCategoryId(val);
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
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={CREATE_CATEGORY_VALUE}>
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Criar nova categoria
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {isCreatingCategory && (
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
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label
                htmlFor="paymentMethod"
                className="text-sm font-medium flex items-center gap-2"
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
                    setIsCreatingPaymentAccount(false);
                    setIsLinkingPaymentAccount(false);
                    return;
                  }

                  setPaymentMethodId(value);
                  setPaymentAccountId("");
                  setExistingPaymentAccountIdToLink("");
                  setNewPaymentAccountName("");
                  setIsCreatingPaymentAccount(false);
                  setIsLinkingPaymentAccount(false);
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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
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
          </div>

          {/* Payment Account */}
          {selectedPaymentMethod?.accounts_enabled ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-2">
                <Label
                  htmlFor="paymentAccount"
                  className="text-sm font-medium flex items-center gap-2"
                >
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  Conta da Forma de Pagamento
                </Label>
                <Select
                  value={paymentAccountId || NO_PAYMENT_ACCOUNT_VALUE}
                  onValueChange={(value) => {
                    if (value === CREATE_PAYMENT_ACCOUNT_VALUE) {
                      setIsCreatingPaymentAccount(true);
                      setIsLinkingPaymentAccount(false);
                      setPaymentAccountId("");
                      return;
                    }

                    if (value === LINK_PAYMENT_ACCOUNT_VALUE) {
                      setIsLinkingPaymentAccount(true);
                      setIsCreatingPaymentAccount(false);
                      setPaymentAccountId("");
                      return;
                    }

                    if (value === NO_PAYMENT_ACCOUNT_VALUE) {
                      setPaymentAccountId("");
                      setIsCreatingPaymentAccount(false);
                      setIsLinkingPaymentAccount(false);
                      return;
                    }

                    setPaymentAccountId(value);
                    setIsCreatingPaymentAccount(false);
                    setIsLinkingPaymentAccount(false);
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
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Criar nova conta
                      </span>
                    </SelectItem>
                    <SelectItem value={LINK_PAYMENT_ACCOUNT_VALUE}>
                      <span className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Vincular conta existente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {linkedPaymentAccounts.length === 0 &&
              !isCreatingPaymentAccount &&
              !isLinkingPaymentAccount ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta vinculada ainda. Crie ou vincule uma conta para esta forma.
                </p>
              ) : null}

              {isCreatingPaymentAccount ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      Nova conta para {selectedPaymentMethod.name}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingPaymentAccount(false);
                        setNewPaymentAccountName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <Input
                    value={newPaymentAccountName}
                    onChange={(e) => setNewPaymentAccountName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreatePaymentAccount();
                      }
                    }}
                    placeholder="Ex: Cartão Banco X"
                    className="h-11 border-2 focus:border-primary/50"
                  />
                  <Button
                    type="button"
                    onClick={handleCreatePaymentAccount}
                    disabled={isSavingPaymentAccount || !newPaymentAccountName.trim()}
                    className="w-full sm:w-auto"
                  >
                    {isSavingPaymentAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar conta
                      </>
                    )}
                  </Button>
                </div>
              ) : null}

              {isLinkingPaymentAccount ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      Vincular conta existente
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsLinkingPaymentAccount(false);
                        setExistingPaymentAccountIdToLink("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                  <select
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={existingPaymentAccountIdToLink}
                    onChange={(e) => setExistingPaymentAccountIdToLink(e.target.value)}
                  >
                    <option value="">Selecione uma conta</option>
                    {availablePaymentAccountsToLink.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLinkExistingPaymentAccount}
                    disabled={
                      isSavingPaymentAccount ||
                      availablePaymentAccountsToLink.length === 0 ||
                      !existingPaymentAccountIdToLink
                    }
                    className="w-full sm:w-auto"
                  >
                    {isSavingPaymentAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vinculando...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Vincular conta
                      </>
                    )}
                  </Button>
                  {availablePaymentAccountsToLink.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todas as contas já estão vinculadas a esta forma.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : selectedPaymentMethod ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
              {selectedPaymentMethod.name} não exige conta vinculada.
            </div>
          ) : null}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSavingCategory || isSavingPaymentAccount}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300",
              type === "income"
                ? "bg-income hover:bg-income/90 income-glow"
                : "bg-expense hover:bg-expense/90 expense-glow"
            )}
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar {type === "income" ? "Ganho" : "Gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
