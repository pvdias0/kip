import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, Sparkles, Target, PiggyBank } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { motion, type Variants } from "framer-motion";
import { KipLogo } from "@/components/ui/KipLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const benefits = [
  { icon: Target, text: "Metas financeiras claras" },
  { icon: Sparkles, text: "Interface intuitiva" },
  { icon: PiggyBank, text: "Controle total dos gastos" },
];

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Campos obrigatorios",
        description: "Preencha email, senha e confirmacao de senha.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas diferentes",
        description: "A senha e a confirmacao precisam ser iguais.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    try {
      await register(email, password);
      toast({
        title: "Conta criada com sucesso",
        description: "Voce entrou automaticamente na sua conta.",
      });
      navigate("/");
    } catch (err) {
      console.error("Register error:", err);
      toast({
        variant: "destructive",
        title: "Nao foi possivel criar a conta",
        description:
          err instanceof Error
            ? err.message
            : "Este email pode ja estar registrado.",
      });
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Fraca", color: "bg-expense", width: "w-1/4" };
    if (password.length < 10) return { label: "Média", color: "bg-warning", width: "w-1/2" };
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { label: "Forte", color: "bg-income", width: "w-full" };
    }
    return { label: "Boa", color: "bg-income/70", width: "w-3/4" };
  };

  const strength = passwordStrength();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <div className="relative min-h-screen bg-background flex">
      <ThemeToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />
      {/* Left Side - Branding (hidden on mobile) */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-income via-income/90 to-primary" />

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
              <KipLogo size="lg" showText={false} animated={false} />
            </div>

            <div>
              <h1 className="text-5xl font-display font-bold mb-4">Comece Agora</h1>
              <p className="text-xl text-white/80 max-w-md">
                Junte-se a milhares de pessoas que já organizam suas finanças com o KIP.
              </p>
            </div>

            {/* Benefits */}
            <motion.div
              className="space-y-4 pt-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4"
                >
                  <div className="p-2 bg-white/20 rounded-lg">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-medium">{benefit.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Register Form */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <motion.div
            className="flex flex-col items-center justify-center space-y-4 lg:hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <KipLogo size="lg" />
            <p className="text-sm text-muted-foreground text-center">
              Organizador Financeiro Pessoal
            </p>
          </motion.div>

          {/* Register Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-3xl font-display text-center">
                  Criar sua conta
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Comece a gerenciar suas finanças agora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu_email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 text-base border-2 transition-all focus:border-primary/50 focus:ring-primary/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 pr-12 h-12 text-base border-2 transition-all focus:border-primary/50 focus:ring-primary/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {strength && (
                      <motion.div
                        className="space-y-1"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                      >
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${strength.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: strength.width === "w-full" ? "100%" : strength.width === "w-3/4" ? "75%" : strength.width === "w-1/2" ? "50%" : "25%" }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Força da senha: <span className="font-medium">{strength.label}</span>
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirmar Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 pr-12 h-12 text-base border-2 transition-all focus:border-primary/50 focus:ring-primary/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {/* Password Match Indicator */}
                    {confirmPassword && (
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {password === confirmPassword ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-income" />
                            <span className="text-xs text-income">As senhas conferem</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-expense" />
                            <span className="text-xs text-expense">As senhas não conferem</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold btn-primary-glow"
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-4 text-muted-foreground">
                      Já tem uma conta?
                    </span>
                  </div>
                </div>

                <Link to="/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                    size="lg"
                  >
                    Fazer login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.p
            className="text-sm text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Ao criar uma conta, você concorda com nossos termos de uso
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
