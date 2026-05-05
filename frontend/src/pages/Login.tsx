import { useState } from "react";
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
import { Mail, Lock, Loader2, Eye, EyeOff, TrendingUp, Shield, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { KipLogo } from "@/components/ui/KipLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const features = [
  { icon: TrendingUp, text: "Acompanhe seus gastos" },
  { icon: Shield, text: "Dados 100% seguros" },
  { icon: Zap, text: "Interface rápida" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatorios",
        description: "Preencha email e senha para continuar.",
      });
      return;
    }

    try {
      await login(email, password);
      toast({
        title: "Login realizado com sucesso",
        description: "Voce entrou na sua conta.",
      });
      navigate("/");
    } catch (err) {
      console.error("Login page caught error:", err);
      toast({
        variant: "destructive",
        title: "Nao foi possivel entrar",
        description:
          err instanceof Error ? err.message : "Ocorreu um erro durante o login",
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-income" />

        {/* Decorative Circles */}
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
              <h1 className="text-5xl font-display font-bold mb-4">KIP</h1>
              <p className="text-xl text-white/80 max-w-md">
                Organize suas finanças de forma inteligente e tome decisões melhores sobre seu dinheiro.
              </p>
            </div>

            {/* Features */}
            <motion.div
              className="space-y-4 pt-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4"
                >
                  <div className="p-2 bg-white/20 rounded-lg">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
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

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95">
              <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-3xl font-display text-center">
                  Bem-vindo de volta
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Entre na sua conta para continuar
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
                  </div>

                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      Esqueceu sua senha?
                    </Link>
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
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-4 text-muted-foreground">
                      Novo por aqui?
                    </span>
                  </div>
                </div>

                <Link to="/register" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-medium border-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                    size="lg"
                  >
                    Criar uma conta
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
            Seus dados estão protegidos com criptografia de ponta
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
