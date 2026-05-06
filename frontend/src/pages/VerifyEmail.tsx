import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, MailCheck, MailWarning, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api";
import { KipLogo } from "@/components/ui/KipLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type VerificationStatus = "instructions" | "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>("instructions");
  const [message, setMessage] = useState(
    "Confira sua caixa de entrada e clique no link que enviamos para ativar sua conta.",
  );

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token) {
      setStatus("instructions");
      return;
    }

    let isMounted = true;

    const confirmEmail = async () => {
      try {
        setStatus("loading");
        const response = await apiService.verifyEmail(token);

        if (!isMounted) {
          return;
        }

        setStatus("success");
        setMessage(
          response.message ||
            "Email confirmado com sucesso. Voce ja pode entrar na sua conta.",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel confirmar seu email.",
        );
      }
    };

    confirmEmail();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <ThemeToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />

      <div className="w-full max-w-lg">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="items-center text-center space-y-4 pb-6">
            <KipLogo size="lg" />
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                status === "success"
                  ? "bg-income/15 text-income"
                  : status === "error"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/15 text-primary"
              }`}
            >
              {status === "loading" ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : null}
              {status === "success" ? <CheckCircle2 className="h-8 w-8" /> : null}
              {status === "error" ? <MailWarning className="h-8 w-8" /> : null}
              {status === "instructions" ? <MailCheck className="h-8 w-8" /> : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-display">
                {status === "success"
                  ? "Email confirmado"
                  : status === "error"
                    ? "Falha na confirmacao"
                    : "Confirme seu email"}
              </CardTitle>
              <CardDescription className="text-base">{message}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            {email ? (
              <p className="text-sm text-muted-foreground">
                Email cadastrado: <span className="font-medium text-foreground">{email}</span>
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/login" className="sm:min-w-40">
                <Button className="w-full">Ir para login</Button>
              </Link>
              <Link to="/register" className="sm:min-w-40">
                <Button variant="outline" className="w-full">
                  Criar outra conta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
