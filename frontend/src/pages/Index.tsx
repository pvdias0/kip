import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionForm } from "@/components/TransactionForm";
import { PeriodTabs } from "@/components/PeriodTabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, type Variants } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";

const Index = () => {
  const { addTransaction } = useTransactions({ enabled: false });
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split("@")[0] || "Usuario";

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const mainVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <AppShell
      title={displayName}
      subtitle={today}
      headerActions={<TransactionForm onSubmit={addTransaction} />}
      insetClassName="bg-background"
    >
      <motion.main
        className="container-app flex-1 py-6 sm:py-8"
        variants={mainVariants}
        initial="hidden"
        animate="visible"
      >
        <PeriodTabs />
      </motion.main>

      <motion.footer
        className="mt-auto border-t border-border/50 bg-background/50 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="container-app text-center">
          <p className="text-sm text-muted-foreground">
            Organize suas financas de forma simples e eficiente
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} KIP • Seu organizador financeiro
          </p>
        </div>
      </motion.footer>
    </AppShell>
  );
};

export default Index;
