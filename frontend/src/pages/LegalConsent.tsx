import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KipLogo } from "@/components/ui/KipLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LegalConsentFields } from "@/components/legal/LegalConsentFields";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from "@/legal/legalContent";

export default function LegalConsent() {
  const navigate = useNavigate();
  const { logout, setUserData, user } = useAuth();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!legalAccepted) {
      setError("Voce precisa aceitar os Termos de Servico e a Politica de Privacidade para continuar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiService.acceptLegalDocuments({
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: TERMS_OF_SERVICE_VERSION,
        privacyVersion: PRIVACY_POLICY_VERSION,
      });

      setUserData(response.user ?? user);
      setMessage(response.message || "Aceite registrado com sucesso.");
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel registrar o aceite.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <ThemeToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-center">
          <Link to="/" className="inline-flex items-center">
            <KipLogo size="lg" animated={false} />
          </Link>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-income/10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-display">
                Libere o acesso da sua conta
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Identificamos que sua conta ainda nao registrou o aceite da
                Politica de Privacidade e dos Termos de Servico vigentes. O uso
                do sistema permanece bloqueado ate a confirmacao.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 py-6 sm:px-8">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {message ? (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <LegalConsentFields
                accepted={legalAccepted}
                onAcceptedChange={setLegalAccepted}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting || !legalAccepted}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando aceite...
                    </>
                  ) : (
                    "Aceitar e continuar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  Sair
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
