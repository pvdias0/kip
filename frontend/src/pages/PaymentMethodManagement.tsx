import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";

import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { PaymentMethod } from "@/types/finance";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Unplug,
} from "lucide-react";

type MethodScopedValues = Record<number, string>;

export default function PaymentMethodManagement() {
  const navigate = useNavigate();
  const {
    paymentMethods,
    paymentAccounts,
    isLoading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    addPaymentAccount,
    removePaymentAccount,
    linkPaymentAccount,
    unlinkPaymentAccount,
  } = usePaymentMethods();

  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodAccountsEnabled, setNewMethodAccountsEnabled] = useState(false);
  const [newGlobalAccountName, setNewGlobalAccountName] = useState("");
  const [newMethodAccountNames, setNewMethodAccountNames] =
    useState<MethodScopedValues>({});
  const [existingAccountSelections, setExistingAccountSelections] =
    useState<MethodScopedValues>({});
  const [isCreatingMethod, setIsCreatingMethod] = useState(false);
  const [isCreatingGlobalAccount, setIsCreatingGlobalAccount] = useState(false);
  const [busyMethodIds, setBusyMethodIds] = useState<number[]>([]);
  const [busyAccountIds, setBusyAccountIds] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultMethods = paymentMethods.filter((method) => method.is_default);
  const customMethods = paymentMethods.filter((method) => !method.is_default);

  const accountUsageMap = useMemo(() => {
    const usage = new Map<number, string[]>();

    paymentMethods.forEach((method) => {
      method.accounts.forEach((account) => {
        const names = usage.get(account.id) || [];
        usage.set(account.id, [...names, method.name]);
      });
    });

    return usage;
  }, [paymentMethods]);

  const setScopedValue = (
    setter: Dispatch<SetStateAction<MethodScopedValues>>,
    methodId: number,
    value: string,
  ) => {
    setter((prev) => ({
      ...prev,
      [methodId]: value,
    }));
  };

  const markMethodBusy = (methodId: number, nextBusy: boolean) => {
    setBusyMethodIds((prev) =>
      nextBusy ? [...new Set([...prev, methodId])] : prev.filter((id) => id !== methodId),
    );
  };

  const markAccountBusy = (accountId: number, nextBusy: boolean) => {
    setBusyAccountIds((prev) =>
      nextBusy
        ? [...new Set([...prev, accountId])]
        : prev.filter((id) => id !== accountId),
    );
  };

  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddMethod = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);

    if (!newMethodName.trim()) {
      setActionError("Nome da forma de pagamento não pode ficar vazio.");
      return;
    }

    try {
      setIsCreatingMethod(true);
      await addPaymentMethod(newMethodName.trim(), newMethodAccountsEnabled);
      setNewMethodName("");
      setNewMethodAccountsEnabled(false);
      flashSuccess("Forma de pagamento criada com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Erro ao criar forma de pagamento.",
      );
    } finally {
      setIsCreatingMethod(false);
    }
  };

  const handleAddGlobalAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError(null);

    if (!newGlobalAccountName.trim()) {
      setActionError("Nome da conta não pode ficar vazio.");
      return;
    }

    try {
      setIsCreatingGlobalAccount(true);
      await addPaymentAccount(newGlobalAccountName.trim());
      setNewGlobalAccountName("");
      flashSuccess("Conta criada com sucesso.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setIsCreatingGlobalAccount(false);
    }
  };

  const handleToggleMethod = async (method: PaymentMethod, checked: boolean) => {
    setActionError(null);
    try {
      markMethodBusy(method.id, true);
      await updatePaymentMethod(method.id, { accounts_enabled: checked });
      flashSuccess(
        checked
          ? `Contas ativadas para ${method.name}.`
          : `Contas desativadas para ${method.name}.`,
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Erro ao atualizar forma de pagamento.",
      );
    } finally {
      markMethodBusy(method.id, false);
    }
  };

  const handleCreateAccountForMethod = async (method: PaymentMethod) => {
    const accountName = (newMethodAccountNames[method.id] || "").trim();
    setActionError(null);

    if (!accountName) {
      setActionError("Informe um nome para a conta.");
      return;
    }

    try {
      markMethodBusy(method.id, true);
      const account = await addPaymentAccount(accountName);
      await linkPaymentAccount(method.id, account.id);
      setScopedValue(setNewMethodAccountNames, method.id, "");
      flashSuccess(`Conta "${account.name}" criada e vinculada.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao criar conta para a forma.",
      );
    } finally {
      markMethodBusy(method.id, false);
    }
  };

  const handleLinkExistingAccount = async (method: PaymentMethod) => {
    const selectedAccountId = Number.parseInt(
      existingAccountSelections[method.id] || "",
      10,
    );
    setActionError(null);

    if (!Number.isInteger(selectedAccountId) || selectedAccountId <= 0) {
      setActionError("Selecione uma conta para vincular.");
      return;
    }

    try {
      markMethodBusy(method.id, true);
      const linkedAccount = await linkPaymentAccount(method.id, selectedAccountId);
      setScopedValue(setExistingAccountSelections, method.id, "");
      flashSuccess(`Conta "${linkedAccount.name}" vinculada com sucesso.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao vincular conta.",
      );
    } finally {
      markMethodBusy(method.id, false);
    }
  };

  const handleUnlinkAccount = async (methodId: number, accountId: number) => {
    setActionError(null);

    try {
      markMethodBusy(methodId, true);
      await unlinkPaymentAccount(methodId, accountId);
      flashSuccess("Conta desvinculada com sucesso.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao desvincular conta.",
      );
    } finally {
      markMethodBusy(methodId, false);
    }
  };

  const handleDeleteMethod = async (method: PaymentMethod) => {
    setActionError(null);

    try {
      markMethodBusy(method.id, true);
      await removePaymentMethod(method.id);
      flashSuccess(`Forma "${method.name}" deletada com sucesso.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao deletar forma de pagamento.",
      );
    } finally {
      markMethodBusy(method.id, false);
    }
  };

  const handleDeleteAccount = async (accountId: number, accountName: string) => {
    setActionError(null);

    try {
      markAccountBusy(accountId, true);
      await removePaymentAccount(accountId);
      flashSuccess(`Conta "${accountName}" deletada com sucesso.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao deletar conta.",
      );
    } finally {
      markAccountBusy(accountId, false);
    }
  };

  const renderMethodCard = (method: PaymentMethod) => {
    const availableAccounts = paymentAccounts.filter(
      (account) => !method.accounts.some((linked) => linked.id === account.id),
    );
    const methodBusy = busyMethodIds.includes(method.id);

    return (
      <Card key={method.id} className="shadow-md">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{method.name}</CardTitle>
                {method.is_default ? (
                  <Badge variant="secondary">Padrão</Badge>
                ) : (
                  <Badge variant="outline">Personalizada</Badge>
                )}
                <Badge variant={method.accounts_enabled ? "default" : "outline"}>
                  {method.accounts_enabled
                    ? "Contas ativas"
                    : "Contas desativadas"}
                </Badge>
              </div>
              <CardDescription>
                {method.accounts_enabled
                  ? "Essa forma de pagamento exige uma conta vinculada nas novas transações."
                  : "Essa forma de pagamento não exige conta nas novas transações."}
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${method.id}`} className="text-xs sm:text-sm">
                  Contas da forma
                </Label>
                <Switch
                  id={`toggle-${method.id}`}
                  checked={method.accounts_enabled}
                  onCheckedChange={(checked) => void handleToggleMethod(method, checked)}
                  disabled={methodBusy}
                />
              </div>

              {!method.is_default ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={methodBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[95vw] sm:max-w-md mx-auto">
                    <AlertDialogTitle>Deletar forma de pagamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação removerá "{method.name}" se ela não estiver sendo usada em transações.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => void handleDeleteMethod(method)}
                      >
                        Deletar
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {method.accounts_enabled ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Label className="text-sm font-medium">Criar nova conta e vincular</Label>
                  <Input
                    value={newMethodAccountNames[method.id] || ""}
                    onChange={(e) =>
                      setScopedValue(
                        setNewMethodAccountNames,
                        method.id,
                        e.target.value,
                      )
                    }
                    placeholder="Ex: Cartão Banco X"
                    disabled={methodBusy}
                  />
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={methodBusy || !(newMethodAccountNames[method.id] || "").trim()}
                    onClick={() => void handleCreateAccountForMethod(method)}
                  >
                    {methodBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar conta
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Label className="text-sm font-medium">Vincular conta existente</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={existingAccountSelections[method.id] || ""}
                    onChange={(e) =>
                      setScopedValue(
                        setExistingAccountSelections,
                        method.id,
                        e.target.value,
                      )
                    }
                    disabled={methodBusy || availableAccounts.length === 0}
                  >
                    <option value="">Selecione uma conta</option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={
                      methodBusy ||
                      availableAccounts.length === 0 ||
                      !existingAccountSelections[method.id]
                    }
                    onClick={() => void handleLinkExistingAccount(method)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Vincular conta
                  </Button>
                  {availableAccounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Todas as contas cadastradas já estão vinculadas a esta forma.
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
              Ative "Contas da forma" para cadastrar ou vincular contas a esta forma de pagamento.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Contas vinculadas ({method.accounts.length})
              </h3>
            </div>

            {method.accounts.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                Nenhuma conta vinculada.
              </div>
            ) : (
              <div className="space-y-2">
                {method.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {account.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                      disabled={methodBusy}
                      onClick={() => void handleUnlinkAccount(method.id, account.id)}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Desvincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-10 w-10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Formas de Pagamento
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Gerencie formas, contas e vínculos entre elas.
              </p>
            </div>
          </div>
          <ThemeToggle showLabel />
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

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Nova Forma de Pagamento
                </CardTitle>
                <CardDescription>
                  Crie uma nova forma e defina se ela usará contas vinculadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAddMethod}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethodName">Nome</Label>
                    <Input
                      id="paymentMethodName"
                      value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      placeholder="Ex: Vale refeição"
                      disabled={isCreatingMethod}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Contas da forma de pagamento
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ative para usar contas específicas nessa forma.
                      </p>
                    </div>
                    <Switch
                      checked={newMethodAccountsEnabled}
                      onCheckedChange={setNewMethodAccountsEnabled}
                      disabled={isCreatingMethod}
                    />
                  </div>

                  <Button type="submit" disabled={isCreatingMethod}>
                    {isCreatingMethod ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar forma
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Formas Padrão
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  <div className="space-y-4">
                    {defaultMethods.map(renderMethodCard)}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      Formas Personalizadas
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                  </div>
                  {customMethods.length === 0 ? (
                    <Card className="shadow-sm">
                      <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma forma personalizada criada ainda.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {customMethods.map(renderMethodCard)}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Nova Conta Global
                </CardTitle>
                <CardDescription>
                  Crie uma conta reutilizável para vincular em várias formas de pagamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddGlobalAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="globalAccountName">Nome da conta</Label>
                    <Input
                      id="globalAccountName"
                      value={newGlobalAccountName}
                      onChange={(e) => setNewGlobalAccountName(e.target.value)}
                      placeholder="Ex: Banco Y"
                      disabled={isCreatingGlobalAccount}
                    />
                  </div>
                  <Button type="submit" disabled={isCreatingGlobalAccount}>
                    {isCreatingGlobalAccount ? (
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
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Contas Cadastradas</CardTitle>
                <CardDescription>
                  Contas podem ser vinculadas a mais de uma forma de pagamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentAccounts.length === 0 ? (
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                    Nenhuma conta cadastrada.
                  </div>
                ) : (
                  paymentAccounts.map((account) => {
                    const linkedMethods = accountUsageMap.get(account.id) || [];
                    const accountBusy = busyAccountIds.includes(account.id);

                    return (
                      <div
                        key={account.id}
                        className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {linkedMethods.length === 0
                                ? "Ainda não vinculada a nenhuma forma."
                                : `Vinculada a ${linkedMethods.length} forma(s).`}
                            </p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                                disabled={accountBusy}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deletar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] sm:max-w-md mx-auto">
                              <AlertDialogTitle>Deletar conta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação removerá "{account.name}" se ela não estiver sendo usada em transações.
                              </AlertDialogDescription>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() =>
                                    void handleDeleteAccount(account.id, account.name)
                                  }
                                >
                                  Deletar
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {linkedMethods.length === 0 ? (
                            <Badge variant="outline">Sem vínculos</Badge>
                          ) : (
                            linkedMethods.map((methodName) => (
                              <Badge key={`${account.id}-${methodName}`} variant="secondary">
                                {methodName}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
