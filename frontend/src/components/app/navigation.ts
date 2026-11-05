import {
  CreditCard,
  Home,
  MessageCircle,
  PieChart,
  ReceiptText,
  Tags,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  match: (pathname: string) => boolean;
};

export const mainNavigation: NavItem[] = [
  { label: "Início", href: "/", icon: Home, match: (p) => p === "/", description: "Seu saldo e resumo" },
  { label: "Extrato", href: "/extrato", icon: ReceiptText, match: (p) => p.startsWith("/extrato"), description: "Lançamentos por mês e semana" },
  { label: "Carteira", href: "/carteira", icon: Wallet, match: (p) => p.startsWith("/carteira"), description: "Contas, cartões e dívidas" },
  { label: "Relatórios", href: "/relatorios", icon: PieChart, match: (p) => p.startsWith("/relatorios"), description: "Para onde vai o seu dinheiro" },
];

export const settingsNavigation: NavItem[] = [
  { label: "Categorias", href: "/categories", icon: Tags, match: (p) => p.startsWith("/categories"), description: "Organize seus lançamentos" },
  { label: "Formas de pagamento", href: "/payment-methods", icon: CreditCard, match: (p) => p.startsWith("/payment-methods"), description: "Pix, crédito, boleto…" },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle, match: (p) => p.startsWith("/whatsapp"), description: "Lance gastos por mensagem" },
  { label: "Perfil", href: "/profile", icon: UserRound, match: (p) => p.startsWith("/profile"), description: "Seus dados e senha" },
];
