import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

export default function PaymentMethodManagement() {
  const navigate = useNavigate();
  const {
    paymentMethods,
    isLoading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
  } = usePaymentMethods();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodAccountsEnabled, setNewMethodAccountsEnabled] = useState(false);
  const [isCreatingMethod, setIsCreatingMethod] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [editMethodName, setEditMethodName] = useState("");
  const [editAccountsEnabled, setEditAccountsEnabled] = useState(false);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [isDeletingMethod, setIsDeletingMethod] = useState(false);

  const selectedMethod = useMemo(
    () =>
      paymentMethods.find((method) => method.id === selectedMethodId) || null,
    [paymentMethods, selectedMethodId],
  );

  const defaultMethods = paymentMethods.filter((method) => method.is_default);
  const customMethods = paymentMethods.filter((method) => !method.is_default);

  useEffect(() => {
    if (!selectedMethod) {
      setEditMethodName("");
      setEditAccountsEnabled(false);
      return;
    }

    setEditMethodName(selectedMethod.name);
    setEditAccountsEnabled(selectedMethod.accounts_enabled);
  }, [selectedMethod]);

  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewMethodName("");
    setNewMethodAccountsEnabled(false);
  };

  const handleCreateMethod = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);

    if (!newMethodName.trim()) {
      setActionError("Informe um nome para a forma de pagamento.");
      return;
    }

    try {
      setIsCreatingMethod(true);
      await addPaymentMethod(newMethodName.trim(), newMethodAccountsEnabled);
      closeCreateDialog();
      flashSuccess("Forma criada com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao criar forma de pagamento.",
      );
    } finally {
      setIsCreatingMethod(false);
    }
  };

  const handleSaveMethod = async () => {
    if (!selectedMethod) {
      return;
    }

    setActionError(null);

    if (!editMethodName.trim()) {
      setActionError("Informe um nome para a forma de pagamento.");
      return;
    }

    try {
      setIsSavingMethod(true);
      await updatePaymentMethod(selectedMethod.id, {
        name: editMethodName.trim(),
        accounts_enabled: editAccountsEnabled,
      });
      flashSuccess("Forma atualizada com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Erro ao atualizar forma de pagamento.",
      );
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleDeleteMethod = async () => {
    if (!selectedMethod || selectedMethod.is_default) {
      return;
    }

    setActionError(null);

    try {
      setIsDeletingMethod(true);
      await removePaymentMethod(selectedMethod.id);
      setSelectedMethodId(null);
      flashSuccess("Forma removida com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Erro ao remover forma de pagamento.",
      );
    } finally {
      setIsDeletingMethod(false);
    }
  };

  const renderMethodCard = (methodId: number, name: string, isDefault: boolean, accountsEnabled: boolean, accountCount: number) => (
    <button
      type="button"
      key={methodId}
      onClick={() => setSelectedMethodId(methodId)}
      className="w-full text-left"
    >
      <Card className="h-full border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                {name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {accountsEnabled ? "Usa contas" : "Sem contas"}
              </p>
            </div>
            <CreditCard className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDefault ? (
              <Badge variant="secondary">Padrão</Badge>
            ) : (
              <Badge variant="outline">Personalizada</Badge>
            )}
            <Badge variant={accountsEnabled ? "default" : "outline"}>
              {accountCount} conta{accountCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </button>
  );

  return (
    <AppShell
      title="Formas de Pagamento"
      subtitle="Toque em um card para editar."
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/payment-accounts")}
              className="gap-2"
            >
              <Landmark className="h-4 w-4" />
              Contas
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar forma
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova forma de pagamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateMethod} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-payment-method">Nome</Label>
                    <Input
                      id="new-payment-method"
                      value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      placeholder="Ex: Vale refeição"
                      disabled={isCreatingMethod}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Contas da forma
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Exige conta ao lançar transação.
                      </p>
                    </div>
                    <Switch
                      checked={newMethodAccountsEnabled}
                      onCheckedChange={setNewMethodAccountsEnabled}
                      disabled={isCreatingMethod}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeCreateDialog}
                      disabled={isCreatingMethod}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreatingMethod}>
                      {isCreatingMethod ? (
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
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Padrão
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {defaultMethods.map((method) =>
                  renderMethodCard(
                    method.id,
                    method.name,
                    method.is_default,
                    method.accounts_enabled,
                    method.accounts.length,
                  ),
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Personalizadas
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              {customMethods.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma forma personalizada criada.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {customMethods.map((method) =>
                    renderMethodCard(
                      method.id,
                      method.name,
                      method.is_default,
                      method.accounts_enabled,
                      method.accounts.length,
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        <Dialog
          open={selectedMethodId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMethodId(null);
              setActionError(null);
            }
          }}
        >
          <DialogContent className="w-[95vw] sm:max-w-lg">
            {selectedMethod ? (
              <>
                <DialogHeader>
                  <DialogTitle>Editar forma de pagamento</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-payment-method">Nome</Label>
                    <Input
                      id="edit-payment-method"
                      value={editMethodName}
                      onChange={(e) => setEditMethodName(e.target.value)}
                      disabled={isSavingMethod || selectedMethod.is_default}
                    />
                  </div>

                  <div className="rounded-xl border border-border/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Contas da forma
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedMethod.accounts.length} conta
                          {selectedMethod.accounts.length === 1 ? "" : "s"} vinculada
                          {selectedMethod.accounts.length === 1 ? "" : "s"}.
                        </p>
                      </div>
                      <Switch
                        checked={editAccountsEnabled}
                        onCheckedChange={setEditAccountsEnabled}
                        disabled={isSavingMethod}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedMethod.is_default ? (
                      <Badge variant="secondary">Padrão</Badge>
                    ) : (
                      <Badge variant="outline">Personalizada</Badge>
                    )}
                    <Badge variant={selectedMethod.accounts_enabled ? "default" : "outline"}>
                      {selectedMethod.accounts_enabled ? "Ativa contas" : "Sem contas"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => navigate("/payment-accounts")}
                    >
                      <Landmark className="h-4 w-4" />
                      Gerenciar contas
                    </Button>

                    <div className="flex gap-2">
                      {!selectedMethod.is_default ? (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeleteMethod}
                          disabled={isDeletingMethod || isSavingMethod}
                        >
                          {isDeletingMethod ? (
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
                      ) : null}
                      <Button
                        type="button"
                        onClick={handleSaveMethod}
                        disabled={isSavingMethod}
                      >
                        {isSavingMethod ? (
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
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
