import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import type { User } from "@/types/auth";

function getInitials(name?: string) {
  if (!name) {
    return "KP";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUserData } = useAuth();

  const [profile, setProfile] = useState<User | null>(user);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await apiService.getProfile();
        if (!mounted) {
          return;
        }

        const currentUser = response.user as User;
        setProfile(currentUser);
        setName(currentUser.name);
        setEmail(currentUser.email);
        setUserData(currentUser);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setProfileError(
          error instanceof Error ? error.message : "Nao foi possivel carregar seu perfil.",
        );
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [setUserData]);

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    try {
      setIsSavingProfile(true);
      const response = await apiService.updateProfile(name, email);
      const updatedUser = response.user as User;

      if (response.requires_email_verification) {
        navigate(`/verify-email?email=${encodeURIComponent(updatedUser.email)}`);
        logout();
        return;
      }

      setProfile(updatedUser);
      setUserData(updatedUser);
      setProfileMessage(response.message || "Perfil atualizado com sucesso.");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Nao foi possivel atualizar o perfil.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    try {
      setIsSavingPassword(true);
      const response = await apiService.changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(response.message || "Senha atualizada com sucesso.");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Nao foi possivel atualizar a senha.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <AppShell
      title="Perfil"
      subtitle="Atualize seu nome, email e credenciais de acesso"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {profileError ? (
          <Alert variant="destructive">
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoadingProfile ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="items-center text-center">
                <Avatar className="h-20 w-20 border border-border/70">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                    {getInitials(profile?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-display">
                    {profile?.name || "Usuario"}
                  </CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Status da conta</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={profile?.email_verified ? "default" : "outline"}>
                      {profile?.email_verified ? "Email verificado" : "Email pendente"}
                    </Badge>
                    <Badge variant="outline">Acesso protegido</Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">Importante</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Se voce alterar o email, sera necessario confirmar o novo endereco antes de entrar novamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-primary" />
                    Dados do perfil
                  </CardTitle>
                  <CardDescription>
                    Defina como voce quer ser identificado dentro do app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileMessage ? (
                    <Alert variant="success">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{profileMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Nome</Label>
                        <Input
                          id="profile-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isSavingProfile}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="profile-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10"
                            disabled={isSavingProfile}
                          />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSavingProfile} className="min-w-40">
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar perfil"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Seguranca
                  </CardTitle>
                  <CardDescription>
                    Atualize sua senha para manter o acesso protegido.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  ) : null}
                  {passwordMessage ? (
                    <Alert variant="success">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{passwordMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Senha atual</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          disabled={isSavingPassword}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nova senha</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isSavingPassword}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar senha</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isSavingPassword}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={isSavingPassword} className="min-w-40">
                      {isSavingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        "Atualizar senha"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
