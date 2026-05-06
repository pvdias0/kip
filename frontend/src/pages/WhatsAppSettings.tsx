import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MessageCircle, Smartphone } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/api";
import type { WhatsAppProfile, WhatsAppVerificationStatus } from "@/types/whatsapp";

function getVerificationBadge(status: WhatsAppVerificationStatus) {
  if (status === "verified") {
    return <Badge variant="default">Numero verificado</Badge>;
  }

  return <Badge variant="outline">Verificacao pendente</Badge>;
}

function buildWhatsAppChatUrl(phoneNumber?: string | null) {
  const digits = String(phoneNumber || "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
}

export default function WhatsAppSettings() {
  const [profile, setProfile] = useState<WhatsAppProfile | null>(null);
  const [kipBusinessPhoneNumber, setKipBusinessPhoneNumber] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
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
        setKipBusinessPhoneNumber(response.kip_business_phone_number || null);
        setProfile(loadedProfile);
        setPhoneNumber(loadedProfile.phone_number || "");
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
    const effectiveOptIn = Boolean(trimmedPhone);

    try {
      setIsSaving(true);
      const response = await apiService.updateWhatsAppProfile({
        ...(trimmedPhone ? { phone_number: trimmedPhone } : {}),
        opted_in: effectiveOptIn,
      });

      const updatedProfile = response.profile as WhatsAppProfile;
      setKipBusinessPhoneNumber(response.kip_business_phone_number || null);
      setProfile(updatedProfile);
      setPhoneNumber(updatedProfile.phone_number || "");
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

  const kipWhatsAppLink = buildWhatsAppChatUrl(kipBusinessPhoneNumber);

  return (
    <AppShell
      title="WhatsApp"
      subtitle="Gerencie seu numero vinculado para conversar com o KIP"
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getVerificationBadge(profile?.verification_status || "pending")}
                    <Badge variant="secondary">
                      {profile?.phone_number_e164 || "Sem numero vinculado"}
                    </Badge>
                  </div>
                  {kipWhatsAppLink ? (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={kipWhatsAppLink} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        Falar com o KIP no WhatsApp
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Configuracao de uso
                </CardTitle>
                <CardDescription>
                  Cadastre seu numero para habilitar o uso completo do KIP no WhatsApp.
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
                  <div className="space-y-2">
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
                    <p className="text-xs text-muted-foreground">
                      Ao cadastrar seu numero nesta tela, voce declara o consentimento para comunicacoes do KIP no WhatsApp.
                    </p>
                  </div>

                  <div className="flex justify-end">
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
