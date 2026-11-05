import { describe, expect, it } from "vitest";

import { formatDueLabel, formatMonthLabel, formatSignedCurrency, parseMoneyInput } from "@/lib/format";

describe("parseMoneyInput", () => {
  it("aceita virgula, ponto de milhar e ponto decimal", () => {
    expect(parseMoneyInput("50,25")).toBe(50.25);
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
    expect(parseMoneyInput("1234.56")).toBe(1234.56);
    expect(parseMoneyInput("-80,5")).toBe(-80.5);
    expect(parseMoneyInput("")).toBeNaN();
  });
});

describe("formatacao", () => {
  it("mes sem 'De' maiusculo", () => {
    expect(formatMonthLabel(new Date(2026, 10, 4))).toBe("Novembro de 2026");
  });

  it("valor com sinal", () => {
    expect(formatSignedCurrency(10).replace(/\s/g, " ")).toBe("+R$ 10,00");
    expect(formatSignedCurrency(-10).replace(/\s/g, " ")).toBe("−R$ 10,00");
  });

  it("vencimento relativo", () => {
    expect(formatDueLabel("2026-11-04", "2026-11-04")).toBe("vence hoje");
    expect(formatDueLabel("2026-11-05", "2026-11-04")).toBe("vence amanhã");
    expect(formatDueLabel("2026-11-10", "2026-11-04")).toBe("vence em 6 dias");
    expect(formatDueLabel("2026-11-20", "2026-11-04")).toBe("vence 20/11");
  });
});
