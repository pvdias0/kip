import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import {
  clearPendingTransactionAccountId,
  loadTransactionReturnContext,
  savePendingTransactionAccountId,
} from "@/lib/transaction-form-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

export default function PaymentAccountManagement() {
  const navigate = useNavigate();
  const {
    paymentMethods,
    paymentAccounts,
    isLoading,
    error,
    addPaymentAccount,
    updatePaymentAccount,
    removePaymentAccount,
    linkPaymentAccount,
    unlinkPaymentAccount,
  } = usePaymentMethods();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [busyMethodIds, setBusyMethodIds] = useState<number[]>([]);
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [targetPaymentMethodId, setTargetPaymentMethodId] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () =>
      paymentAccounts.find((account) => account.id === selectedAccountId) || null,
    [paymentAccounts, selectedAccountId],
  );

  const linkedMethodIds = useMemo(() => {
    if (!selectedAccountId) {
      return new Set<number>();
    }

    return new Set(
      paymentMethods
        .filter((method) =>
          method.accounts.some((account) => account.id === selectedAccountId),
        )
        .map((method) => method.id),
    );
  }, [paymentMethods, selectedAccountId]);

  useEffect(() => {
    setEditAccountName(selectedAccount?.name || "");
  }, [selectedAccount]);

  useEffect(() => {
    const context = loadTransactionReturnContext();
    setReturnPath(context?.returnPath || null);
    setTargetPaymentMethodId(context?.paymentMethodId || null);
  }, []);

  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const returnToTransaction = (accountId?: number) => {
    if (accountId) {
      savePendingTransactionAccountId(accountId);
    } else {
      clearPendingTransactionAccountId();
    }

    navigate(returnPath || "/");
  };

  const handleCreateAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);

    if (!newAccountName.trim()) {
      setActionError("Informe um nome para a conta.");
      return;
    }

    try {
      setIsCreatingAccount(true);
      const createdAccount = await addPaymentAccount(newAccountName.trim());
      setNewAccountName("");
      setIsCreateDialogOpen(false);
      flashSuccess("Conta criada com sucesso.");

      if (targetPaymentMethodId) {
        setSelectedAccountId(createdAccount.id);
      } else if (returnPath) {
        returnToTransaction(createdAccount.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount) {
      return;
    }

    setActionError(null);

    if (!editAccountName.trim()) {
      setActionError("Informe um nome para a conta.");
      return;
    }

    try {
      setIsSavingAccount(true);
      await updatePaymentAccount(selectedAccount.id, editAccountName.trim());
      flashSuccess("Conta atualizada com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao atualizar conta.",
      );
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) {
      return;
    }

    setActionError(null);

    try {
      setIsDeletingAccount(true);
      await removePaymentAccount(selectedAccount.id);
      setSelectedAccountId(null);
      flashSuccess("Conta removida com sucesso.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao remover conta.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleToggleLink = async (methodId: number, checked: boolean) => {
    if (!selectedAccount) {
      return;
    }

    setActionError(null);
    setBusyMethodIds((prev) => [...new Set([...prev, methodId])]);

    try {
      if (checked) {
        await linkPaymentAccount(methodId, selectedAccount.id);
      } else {
        await unlinkPaymentAccount(methodId, selectedAccount.id);
      }

      flashSuccess("Vínculo atualizado com sucesso.");

      if (
        checked &&
        targetPaymentMethodId &&
        String(methodId) === targetPaymentMethodId
      ) {
        returnToTransaction(selectedAccount.id);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao atualizar vínculo.",
      );
    } finally {
      setBusyMethodIds((prev) => prev.filter((id) => id !== methodId));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/35 to-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/payment-methods")}
              className="h-10 w-10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Contas de Pagamento</h1>
              <p className="text-sm text-muted-foreground">
                Toque em um card para editar vínculos e nome.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {returnPath ? (
              <Button variant="outline" onClick={() => returnToTransaction()}>
                Voltar para transação
              </Button>
            ) : null}

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar conta
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova conta</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-payment-account">Nome</Label>
                    <Input
                      id="new-payment-account"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Ex: Cartão Banco X"
                      disabled={isCreatingAccount}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreatingAccount}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreatingAccount}>
                      {isCreatingAccount ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        "Criar"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {successMessage ? (
          <Alert variant="success" className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {actionError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : paymentAccounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma conta cadastrada.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paymentAccounts.map((account) => {
              const linkedCount = paymentMethods.filter((method) =>
                method.accounts.some((item) => item.id === account.id),
              ).length;

              return (
                <button
                  type="button"
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className="w-full text-left"
                >
                  <Card className="h-full border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                            {account.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {linkedCount} forma{linkedCount === 1 ? "" : "s"} vinculada
                            {linkedCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <Landmark className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {linkedCount === 0 ? (
                          <Badge variant="outline">Sem vínculos</Badge>
                        ) : (
                          <Badge variant="secondary">Conta ativa</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        <Dialog
          open={selectedAccountId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAccountId(null);
              setActionError(null);
            }
          }}
        >
          <DialogContent className="w-[95vw] sm:max-w-xl">
            {selectedAccount ? (
              <>
                <DialogHeader>
                  <DialogTitle>Editar conta</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-payment-account">Nome</Label>
                    <Input
                      id="edit-payment-account"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      disabled={isSavingAccount}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Formas vinculadas
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {paymentMethods.map((method) => {
                        const checked = linkedMethodIds.has(method.id);
                        const disabled = busyMethodIds.includes(method.id) || !method.accounts_enabled;

                        return (
                          <label
                            key={method.id}
                            className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-3"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) =>
                                void handleToggleLink(method.id, value === true)
                              }
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {method.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {method.accounts_enabled
                                  ? "Aceita vínculo"
                                  : "Ative contas nesta forma"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {targetPaymentMethodId &&
                    linkedMethodIds.has(Number(targetPaymentMethodId)) ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => returnToTransaction(selectedAccount.id)}
                      >
                        Usar na transação
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount || isSavingAccount}
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removendo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveAccount}
                      disabled={isSavingAccount}
                    >
                      {isSavingAccount ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
