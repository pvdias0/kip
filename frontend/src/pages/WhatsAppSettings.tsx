import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck, Smartphone } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiService } from "@/services/api";
import type { WhatsAppProfile, WhatsAppVerificationStatus } from "@/types/whatsapp";

function getVerificationBadge(status: WhatsAppVerificationStatus) {
  if (status === "verified") {
    return <Badge variant="default">Numero verificado</Badge>;
  }

  return <Badge variant="outline">Verificacao pendente</Badge>;
}

export default function WhatsAppSettings() {
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [optedIn, setOptedIn] = useState(false);
  const [optInSource, setOptInSource] = useState("app_profile");
  const [receiveSupportMessages, setReceiveSupportMessages] = useState(true);
  const [receiveTransactionalMessages, setReceiveTransactionalMessages] = useState(true);
  const [receiveWeeklySummary, setReceiveWeeklySummary] = useState(false);
  const [receiveBudgetAlerts, setReceiveBudgetAlerts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getWhatsAppProfile();

        if (!mounted) {
          return;
        }

        const loadedProfile = response.profile as WhatsAppProfile;
        setProfile(loadedProfile);
        setPhoneNumber(loadedProfile.phone_number || "");
        setOptedIn(Boolean(loadedProfile.opted_in));
        setOptInSource(loadedProfile.opt_in_source || "app_profile");
        setReceiveSupportMessages(loadedProfile.receive_support_messages ?? true);
        setReceiveTransactionalMessages(
          loadedProfile.receive_transactional_messages ?? true,
        );
        setReceiveWeeklySummary(loadedProfile.receive_weekly_summary ?? false);
        setReceiveBudgetAlerts(loadedProfile.receive_budget_alerts ?? false);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar as configuracoes do WhatsApp.",
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedPhone = phoneNumber.trim();
    const trimmedSource = optInSource.trim();

    if (optedIn && !trimmedPhone) {
      setErrorMessage("Informe um numero de WhatsApp valido para ativar o recebimento.");
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiService.updateWhatsAppProfile({
        ...(trimmedPhone ? { phone_number: trimmedPhone } : {}),
        opted_in: optedIn,
        ...(trimmedSource ? { opt_in_source: trimmedSource } : {}),
        receive_support_messages: receiveSupportMessages,
        receive_transactional_messages: receiveTransactionalMessages,
        receive_weekly_summary: receiveWeeklySummary,
        receive_budget_alerts: receiveBudgetAlerts,
      });

      const updatedProfile = response.profile as WhatsAppProfile;
      setProfile(updatedProfile);
      setPhoneNumber(updatedProfile.phone_number || "");
      setOptedIn(Boolean(updatedProfile.opted_in));
      setOptInSource(updatedProfile.opt_in_source || trimmedSource || "app_profile");
      setReceiveSupportMessages(updatedProfile.receive_support_messages ?? true);
      setReceiveTransactionalMessages(updatedProfile.receive_transactional_messages ?? true);
      setReceiveWeeklySummary(updatedProfile.receive_weekly_summary ?? false);
      setReceiveBudgetAlerts(updatedProfile.receive_budget_alerts ?? false);
      setSuccessMessage(
        response.message || "Configuracoes de WhatsApp atualizadas com sucesso.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar as configuracoes do WhatsApp.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="WhatsApp"
      subtitle="Gerencie seu numero vinculado e preferencias de mensagens"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Vinculo do numero
                </CardTitle>
                <CardDescription>
                  O numero so e marcado como verificado depois da primeira mensagem recebida.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {getVerificationBadge(profile?.verification_status || "pending")}
                  <Badge variant="secondary">
                    {profile?.phone_number_e164 || "Sem numero vinculado"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Preferencias de mensagens
                </CardTitle>
                <CardDescription>
                  Escolha quais tipos de comunicacao o KIP pode enviar no WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {successMessage ? (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-phone">Numero do WhatsApp</Label>
                      <Input
                        id="whatsapp-phone"
                        placeholder="+55 11 99999-9999"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-opt-in-source">Origem do opt-in</Label>
                      <Input
                        id="whatsapp-opt-in-source"
                        placeholder="app_profile"
                        value={optInSource}
                        onChange={(event) => setOptInSource(event.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Recebimento geral</p>
                        <p className="text-sm text-muted-foreground">
                          Habilita ou desabilita o canal de WhatsApp para sua conta.
                        </p>
                      </div>
                      <Switch checked={optedIn} onCheckedChange={setOptedIn} disabled={isSaving} />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Mensagens de suporte</p>
                        <p className="text-sm text-muted-foreground">
                          Fluxos de ajuda, instrucoes e orientacoes.
                        </p>
                      </div>
                      <Switch
                        checked={receiveSupportMessages}
                        onCheckedChange={setReceiveSupportMessages}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Mensagens transacionais</p>
                        <p className="text-sm text-muted-foreground">
                          Respostas para consultar e registrar lancamentos financeiros.
                        </p>
                      </div>
                      <Switch
                        checked={receiveTransactionalMessages}
                        onCheckedChange={setReceiveTransactionalMessages}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Resumo semanal</p>
                        <p className="text-sm text-muted-foreground">
                          Atualizacoes periodicas sobre seu desempenho financeiro.
                        </p>
                      </div>
                      <Switch
                        checked={receiveWeeklySummary}
                        onCheckedChange={setReceiveWeeklySummary}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Alertas de orçamento</p>
                        <p className="text-sm text-muted-foreground">
                          Avisos quando seu consumo estiver acima do esperado.
                        </p>
                      </div>
                      <Switch
                        checked={receiveBudgetAlerts}
                        onCheckedChange={setReceiveBudgetAlerts}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        O KIP so responde dentro da janela de 24 horas apos mensagem recebida.
                      </p>
                    </div>
                    <Button type="submit" disabled={isSaving} className="min-w-36">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
