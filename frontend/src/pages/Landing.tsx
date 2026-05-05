import { Button } from "@/components/ui/button";
import { KipLogo } from "@/components/ui/KipLogo";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const Landing = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      },
    },
  };

  const features = [
    {
      icon: Wallet,
      title: "Gestão Inteligente",
      description:
        "Registre todas as suas receitas e despesas de forma simples e organizada com categorias personalizáveis.",
    },
    {
      icon: BarChart3,
      title: "Análises Detalhadas",
      description:
        "Visualize gráficos e relatórios em tempo real para entender melhor seus gastos e receitas.",
    },
    {
      icon: TrendingUp,
      title: "Acompanhamento de Tendências",
      description:
        "Compare meses e identifique padrões de gastos para tomar melhores decisões financeiras.",
    },
    {
      icon: Shield,
      title: "Segurança",
      description:
        "Seus dados financeiros estão protegidos com criptografia e autenticação segura.",
    },
    {
      icon: Zap,
      title: "Rápido e Eficiente",
      description:
        "Interface intuitiva que permite registrar transações em segundos, sem complicações.",
    },
    {
      icon: TrendingDown,
      title: "Controle Total",
      description:
        "Tenha controle completo sobre todas as suas transações com recursos de edição e exclusão.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Crie sua Conta",
      description:
        "Registre-se em segundos com suas informações básicas e comece imediatamente.",
    },
    {
      number: "02",
      title: "Configure Categorias",
      description:
        "Personalize suas categorias de despesas e receitas conforme sua necessidade.",
    },
    {
      number: "03",
      title: "Registre Transações",
      description:
        "Adicione suas receitas e despesas com data, valor e descrição.",
    },
    {
      number: "04",
      title: "Analise seus Dados",
      description:
        "Visualize gráficos, relatórios e tenha insights sobre sua saúde financeira.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <KipLogo />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Recursos
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Como Funciona
              </a>
              <Link to="/login">
                <Button variant="default" size="sm">
                  Entrar
                </Button>
              </Link>
              <ThemeToggle />
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden pt-4 pb-4 flex flex-col gap-4"
            >
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Recursos
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Como Funciona
              </a>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="default" className="w-full">
                  Entrar
                </Button>
              </Link>
              <ThemeToggle showLabel className="w-full justify-center" />
            </motion.div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              ✨ Gestão Financeira Simplificada
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight"
          >
            Controle Suas Finanças
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary">
              {" "}
              com Simplicidade
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            <span className="text-primary font-semibold">KIP</span> é uma plataforma intuitiva para gerenciar suas receitas, despesas
            e categorias financeiras. Tenha insights claros sobre sua saúde
            financeira com análises em tempo real.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Criar Conta
              </Button>
            </Link>
          </motion.div>

          {/* Hero Image/Illustration */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-b from-primary/10 to-accent/10 rounded-lg border border-primary/20 p-6 sm:p-8 lg:p-12 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Stat Cards */}
              <div className="bg-card/50 backdrop-blur rounded-lg p-4 border border-border">
                <div className="text-income text-2xl sm:text-3xl font-bold mb-2">
                  +R$ 5.489
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total de Receitas
                </p>
              </div>
              <div className="bg-card/50 backdrop-blur rounded-lg p-4 border border-border">
                <div className="text-expense text-2xl sm:text-3xl font-bold mb-2">
                  -R$ 2.891
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total de Despesas
                </p>
              </div>
              <div className="bg-card/50 backdrop-blur rounded-lg p-4 border border-border">
                <div className="text-primary text-2xl sm:text-3xl font-bold mb-2">
                  +R$ 2.598
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Saldo Atual
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 lg:py-32 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-4xl mx-auto"
          >
            {/* Section Header */}
            <motion.div variants={itemVariants} className="text-center mb-12 sm:mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Recursos Poderosos
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Tudo que você precisa para gerenciar suas finanças pessoais com
                facilidade
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="bg-background border border-border rounded-lg p-6 sm:p-8 hover:border-primary/50 transition-all hover:shadow-lg"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 sm:py-20 lg:py-32 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-5xl mx-auto"
          >
            {/* Section Header */}
            <motion.div variants={itemVariants} className="text-center mb-12 sm:mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Como Funciona
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Comece em 4 passos simples
              </p>
            </motion.div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-6 lg:gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6 sm:p-8 border border-primary/20 h-full"
                  >
                    <div className="text-4xl sm:text-5xl font-bold text-primary/30 mb-4">
                      {step.number}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {step.description}
                    </p>
                  </motion.div>

                  {/* Connection line (hidden on mobile and tablet) */}
                  {(index === 0 || index === 2) && (
                    <div className="hidden lg:block absolute -right-7 top-1/2 transform translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-primary/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 lg:py-32 bg-gradient-to-r from-primary/10 to-accent/10 border-y border-primary/20">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            >
              Pronto para Controlar Suas Finanças?
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-muted-foreground mb-8"
            >
              Comece gratuitamente agora e descubra como é fácil gerenciar suas
              finanças com KIP.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Acessar Plataforma
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Registre-se Agora
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-12">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <KipLogo />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Controle suas finanças com simplicidade e segurança
                </p>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                  Produto
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li>
                    <a
                      href="#features"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Recursos
                    </a>
                  </li>
                  <li>
                    <a
                      href="#how-it-works"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Como Funciona
                    </a>
                  </li>
                </ul>
              </div>

              {/* Account */}
              <div>
                <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                  Conta
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li>
                    <Link
                      to="/login"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/register"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Registrar
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
                  Legal
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Privacidade
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Termos de Uso
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-border pt-8 sm:pt-12 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                © 2026 KIP. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
