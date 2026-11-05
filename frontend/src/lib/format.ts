import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

/** Valor com sinal explicito: "+R$ 10,00" / "−R$ 10,00". */
export function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${currency.format(Math.abs(value))}`;
}

export function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** "Novembro de 2026" (sem o "De" maiusculo do text-transform: capitalize). */
export function formatMonthLabel(date: Date) {
  return capitalize(format(date, "MMMM 'de' yyyy", { locale: ptBR }));
}

export function formatShortDate(iso: string) {
  return format(parseISO(iso), "dd/MM", { locale: ptBR });
}

/** "Hoje", "Ontem" ou "Segunda, 3 de novembro". */
export function formatDayHeading(iso: string) {
  const date = parseISO(iso);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return capitalize(format(date, "EEEE, d 'de' MMMM", { locale: ptBR }));
}

export function formatDueLabel(iso: string | null, today: string) {
  if (!iso) return null;
  const days = Math.round((parseISO(iso).getTime() - parseISO(today).getTime()) / 86_400_000);
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days > 1 && days <= 7) return `vence em ${days} dias`;
  return `vence ${format(parseISO(iso), "dd/MM")}`;
}

export function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

/** Aceita "1.234,56", "1234,56" ou "1234.56". */
export function parseMoneyInput(raw: string) {
  const cleaned = raw.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return Number.NaN;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  return Number.parseFloat(normalized);
}
