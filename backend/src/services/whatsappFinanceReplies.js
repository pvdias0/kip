/**
 * Respostas do assistente do WhatsApp sobre a visao geral financeira:
 * saldo das contas, faturas de cartao e dividas. Usa a mesma fonte da tela
 * Inicio (getFinanceOverview), entao os numeros sempre batem com o app.
 */

export const FINANCE_INTENTS = ["get_balance", "get_cards", "get_debts"];

const DEBT_KIND_LABELS = {
  loan: "Empréstimo",
  financing: "Financiamento",
  installment: "Compra parcelada",
  other: "Dívida",
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );
}

function shortDate(iso) {
  if (!iso) return null;
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}`;
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function dueLabel(today, iso) {
  if (!iso) return null;
  const days = daysBetween(today, iso);
  if (days < 0) return `venceu em ${shortDate(iso)}`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence ${shortDate(iso)} (em ${days} dias)`;
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function monthName(iso) {
  return MONTHS[Number(String(iso).slice(5, 7)) - 1] || "este mês";
}

// ---------------------------------------------------------------------------
// Roteamento local (sem chamar o Gemini)
// ---------------------------------------------------------------------------

const COMMANDS = {
  saldo: "get_balance",
  saldos: "get_balance",
  patrimonio: "get_balance",
  "visao geral": "get_balance",
  resumo: "get_balance",
  fatura: "get_cards",
  faturas: "get_cards",
  cartao: "get_cards",
  cartoes: "get_cards",
  divida: "get_debts",
  dividas: "get_debts",
};

/** Comandos de uma palavra ("saldo", "faturas", "dividas"). */
export function matchFinanceCommand(messageText) {
  const normalized = normalize(messageText).replace(/^\//, "").replace(/[?!.]+$/, "");
  return COMMANDS[normalized] || null;
}

// Verbos de acao: "paguei a fatura", "gastei 50 no cartao" sao lancamentos,
// nao consultas.
const ACTION_VERBS =
  /\b(gastei|paguei|comprei|recebi|ganhei|transferi|deposite[i]?|lance|lanca|registr\w*|cri\w*|adicion\w*|cadastr\w*|exclu\w*|apag\w*|delet\w*|remov\w*|edit\w*|alter\w*|renome\w*)\b/;

const DEBT_PATTERN =
  /\b(dividas?|devendo|emprestimos?|financiamentos?|parcelas? (?:que )?(?:faltam|restantes?)|quanto (?:eu )?devo|quanto falta pagar)\b/;
const CARD_PATTERN = /\b(faturas?|cartao|cartoes|limite)\b/;
const BALANCE_PATTERN =
  /\b(saldos?|quanto (?:eu )?tenho|quanto (?:de )?dinheiro|patrimonio|visao geral|minhas contas|meu dinheiro)\b/;

/**
 * Perguntas como "qual meu saldo?", "quanto devo?", "como esta minha fatura?".
 * Retorna null quando a mensagem parece um lancamento ou uma acao.
 */
export function detectFinanceQuestion(messageText) {
  const normalized = normalize(messageText);

  if (!normalized || ACTION_VERBS.test(normalized) || /\d/.test(normalized)) {
    return null;
  }

  if (DEBT_PATTERN.test(normalized)) return "get_debts";
  if (CARD_PATTERN.test(normalized)) return "get_cards";
  if (BALANCE_PATTERN.test(normalized)) return "get_balance";
  return null;
}

// ---------------------------------------------------------------------------
// Formatacao das respostas
// ---------------------------------------------------------------------------

function cardLines(account, today) {
  const card = account.card;
  const lines = [`💳 *${account.name}*`];

  if (card.closed_invoice > 0) {
    lines.push(`   Fatura fechada: ${money(card.closed_invoice)} • ${dueLabel(today, card.next_due_date) || "a pagar"}`);
  }

  lines.push(`   Fatura aberta: ${money(card.open_invoice)}${card.next_closing_date ? ` • fecha ${shortDate(card.next_closing_date)}` : ""}`);

  if (card.available_limit !== null && card.available_limit !== undefined) {
    lines.push(`   Limite disponível: ${money(card.available_limit)} de ${money(card.credit_limit)}`);
  }

  return lines;
}

function debtProgress(debt) {
  if (debt.installments_total) {
    return `${debt.installments_paid}/${debt.installments_total} parcelas pagas`;
  }
  return `${money(debt.paid_amount)} pagos de ${money(debt.amount_due)}`;
}

export function formatBalanceReply(overview) {
  const today = overview.today;
  const lines = ["🏦 *Sua visão geral*", ""];

  lines.push(`💰 Saldo em contas: *${money(overview.cash_total)}*`);

  const accounts = overview.accounts || [];
  for (const account of accounts) {
    lines.push(`   • ${account.name}: ${money(account.balance)}`);
  }
  const unassigned = overview.unassigned;
  if (unassigned && (unassigned.balance !== 0 || accounts.length === 0)) {
    lines.push(`   • Dinheiro e outros: ${money(unassigned.balance)}`);
  }

  if (overview.cards_owed > 0) {
    lines.push(`💳 Faturas de cartão: -${money(overview.cards_owed)}`);
  }
  if (overview.debts_total > 0) {
    lines.push(`📉 Dívidas: -${money(overview.debts_total)}`);
  }
  if (overview.cards_owed > 0 || overview.debts_total > 0) {
    lines.push(`🧮 Patrimônio líquido: *${money(overview.net_worth)}*`);
  }

  const month = overview.month;
  if (month) {
    lines.push("");
    lines.push(`📅 *Em ${monthName(month.start)}*`);
    lines.push(`   Você começou o mês com ${money(overview.previous_month_cash)}`);
    lines.push(`   Entrou ${money(month.income)} • Saiu ${money(month.expense)}`);
    lines.push(
      month.result >= 0
        ? `   Sobrou ${money(month.result)} até agora`
        : `   Faltou ${money(Math.abs(month.result))} até agora`,
    );
  }

  const upcoming = [];
  for (const account of accounts) {
    if (account.card && account.card.closed_invoice > 0 && account.card.next_due_date) {
      upcoming.push({ date: account.card.next_due_date, text: `Fatura ${account.name} • ${money(account.card.closed_invoice)}` });
    }
  }
  for (const debt of overview.debts || []) {
    if (!debt.settled && debt.next_due_date) {
      upcoming.push({
        date: debt.next_due_date,
        text: `${debt.name}${debt.installment_amount ? ` • ${money(debt.installment_amount)}` : ""}`,
      });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length > 0) {
    lines.push("");
    lines.push("⏰ *Próximos vencimentos*");
    for (const item of upcoming.slice(0, 4)) {
      lines.push(`   • ${shortDate(item.date)} — ${item.text}`);
    }
  }

  lines.push("");
  lines.push('💡 Peça "faturas" ou "dívidas" para ver os detalhes.');
  return lines.join("\n");
}

export function formatCardsReply(overview) {
  const today = overview.today;
  const cards = (overview.accounts || []).filter((account) => account.card);

  if (cards.length === 0) {
    return [
      "💳 *Você ainda não tem cartões cadastrados.*",
      "",
      "No app, abra *Carteira → Cartões* e marque a conta que tem cartão de crédito, com dia de fechamento e vencimento.",
    ].join("\n");
  }

  const lines = ["💳 *Seus cartões*", ""];
  cards.forEach((account, index) => {
    if (index > 0) lines.push("");
    lines.push(...cardLines(account, today));
  });

  lines.push("");
  lines.push(`Total em faturas: *${money(overview.cards_owed)}*`);
  return lines.join("\n");
}

export function formatDebtsReply(overview) {
  const today = overview.today;
  const open = (overview.debts || []).filter((debt) => !debt.settled);

  if (open.length === 0) {
    return [
      "🎉 *Você não tem dívidas em aberto.*",
      "",
      "Para acompanhar um empréstimo, financiamento ou compra parcelada, cadastre em *Carteira → Dívidas* no app.",
    ].join("\n");
  }

  const lines = ["📉 *Suas dívidas*", ""];
  open.forEach((debt, index) => {
    if (index > 0) lines.push("");
    const kind = DEBT_KIND_LABELS[debt.kind] || "Dívida";
    lines.push(`*${debt.name}* (${kind}${debt.creditor ? ` • ${debt.creditor}` : ""})`);
    lines.push(`   Falta pagar: ${money(debt.remaining)}`);
    lines.push(`   ${debtProgress(debt)}`);
    const next = dueLabel(today, debt.next_due_date);
    if (next) {
      lines.push(`   Próxima parcela: ${debt.installment_amount ? `${money(debt.installment_amount)} • ` : ""}${next}`);
    }
  });

  lines.push("");
  lines.push(`Total devido: *${money(overview.debts_total)}*`);
  return lines.join("\n");
}

export function formatFinanceReply(intent, overview) {
  if (intent === "get_cards") return formatCardsReply(overview);
  if (intent === "get_debts") return formatDebtsReply(overview);
  return formatBalanceReply(overview);
}
