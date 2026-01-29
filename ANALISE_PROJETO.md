# Análise do Projeto KIP - Organizador Financeiro

## 📋 Resumo da Proposta

O projeto **KIP** é um **aplicativo web para organização financeira pessoal** baseado no modelo de planilhas que você utilizava. O sistema permite:

- ✅ Registrar **ganhos diários** (renda, freelance, investimentos, etc.)
- ✅ Registrar **gastos diários** (alimentação, transporte, moradia, etc.)
- ✅ Visualizar **totalizações por semana e por mês**
- ✅ Analisar **categorias de gastos e ganhos**
- ✅ Acompanhar o **saldo mensal**

---

## 🏗️ Arquitetura Atual

### **Frontend (React + TypeScript)**

**Stack tecnológico:**
- **Framework**: React 18.3 + Vite
- **Roteamento**: React Router v6
- **Estado**: LocalStorage (atualmente) + React Query (TanStack Query)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Formulários**: React Hook Form + Zod (validação)
- **Gráficos**: Recharts
- **Data**: date-fns (manipulação de datas)
- **Notificações**: Sonner e React Toaster

**Estrutura de pastas:**
```
frontend/src/
├── pages/
│   ├── Index.tsx        → Homepage com transações semanais
│   ├── Dashboard.tsx    → Dashboard mensal com estatísticas
│   └── NotFound.tsx     → Página 404
├── components/
│   ├── TransactionForm.tsx      → Formulário para adicionar transações
│   ├── TransactionList.tsx      → Lista de transações
│   ├── MonthNavigator.tsx       → Navegação entre meses
│   ├── WeekSelector.tsx         → Seletor de semanas
│   ├── PeriodTabs.tsx           → Abas para período (semana/mês)
│   ├── RankingList.tsx          → Top 5 ganhos/gastos
│   ├── CategoryChart.tsx        → Gráfico de categorias
│   ├── SummaryCard.tsx          → Card de resumo (totais)
│   └── ui/                      → Componentes base (button, input, etc.)
├── hooks/
│   ├── useTransactions.ts       → Gerenciamento de transações
│   ├── useTransactionStats.ts   → Cálculo de estatísticas
│   └── use-toast.ts & use-mobile.tsx
├── types/
│   └── finance.ts               → Tipos TypeScript
└── lib/
    └── utils.ts                 → Utilitários
```

### **Tipos de Dados**

```typescript
interface Transaction {
  id: string;                     // UUID
  type: 'income' | 'expense';     // Tipo de transação
  amount: number;                 // Valor
  description: string;            // Descrição
  category: string;               // Categoria
  date: string;                   // Data (ISO format)
  createdAt: string;              // Data de criação
}

interface TransactionSummary {
  totalIncome: number;            // Total de ganhos
  totalExpense: number;           // Total de gastos
  balance: number;                // Saldo (ganhos - gastos)
}
```

**Categorias:**
- **Ganhos**: Salário, Freelance, Investimentos, Vendas, Outros
- **Gastos**: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Compras, Contas, Outros

### **Banco de Dados (PostgreSQL)**

**Status**: Estrutura criada (vazio) em `kip-estrutura.sql`
- Database version: 18.0
- Aguardando schema completo (tabelas, relações, índices)

---

## 🎯 Funcionalidades Implementadas no Frontend

### Página Principal (`Index.tsx`)
- Header com título "Minhas Finanças"
- Botão para criar nova transação
- Link para dashboard
- Abas de período (semana/mês) com transações filtradas

### Dashboard (`Dashboard.tsx`)
- Navegação entre meses (anterior/próximo)
- **Cards de resumo**: Total de ganhos, total de gastos, saldo
- **Gráficos**: Distribuição de gastos por categoria, distribuição de ganhos por categoria
- **Ranking**: Top 5 maiores gastos, Top 5 maiores ganhos
- Lista de transações do mês

### Componentes

| Componente | Responsabilidade |
|-----------|------------------|
| `TransactionForm` | Modal para adicionar nova transação |
| `TransactionList` | Exibe lista de transações com opção de deletar |
| `MonthNavigator` | Navegação entre meses (botões anterior/próximo) |
| `PeriodTabs` | Abas para filtrar por semana ou mês |
| `CategoryChart` | Gráfico de pizza (Recharts) de despesas/receitas por categoria |
| `RankingList` | Top 5 transações (maiores valores) |
| `SummaryCard` | Card com ícone + valor + título |

### Hooks Customizados

**`useTransactions()`**
- Gerencia transações com localStorage
- Métodos: `addTransaction`, `deleteTransaction`, `getWeekTransactions`, `getMonthTransactions`, `getWeekSummary`, `getMonthSummary`

**`useTransactionStats()`**
- Calcula estatísticas para um mês selecionado
- Retorna: `totalIncome`, `totalExpense`, `balance`, `topExpenses`, `topIncomes`, `expenseCategoryData`, `incomeCategoryData`

---

## 🔌 Pontos de Integração Backend

### O que precisa ser implementado no backend

1. **API REST** (ou GraphQL)
   - `POST /api/transactions` → Criar transação
   - `GET /api/transactions` → Listar transações (com filtros)
   - `GET /api/transactions/:id` → Obter detalhes
   - `PUT /api/transactions/:id` → Atualizar transação
   - `DELETE /api/transactions/:id` → Deletar transação
   - `GET /api/stats` → Obter estatísticas (período específico)

2. **Autenticação** (não implementada no frontend)
   - Login/registro de usuários
   - JWT ou sessão

3. **Banco de Dados**
   - Tabela `users` (usuários)
   - Tabela `transactions` (transações com user_id)
   - Índices para filtros rápidos (por data, por usuário, por categoria)

4. **Validação e Segurança**
   - Validar entrada de dados
   - Autorização (usuário só acessa suas transações)
   - Rate limiting

---

## 📊 Fluxo de Dados Atual

```
TransactionForm → useTransactions.addTransaction() → localStorage
                                                   ↓
                                    Estado local (React)
                                                   ↓
TransactionList / Dashboard ← useTransactionStats() ← Lê transactions
```

### Após integração com backend:

```
TransactionForm → API POST /api/transactions → Backend → PostgreSQL
                                                   ↓
React Query (cache) ← API GET /api/transactions ← Backend
                    ↓
            Dashboard / TransactionList
```

---

## ✨ Características do Design Frontend

- **Dark Mode / Light Mode**: Suporte nativo com `next-themes` (mas não está ativo no código)
- **Responsivo**: Grid layouts com `md:` e `lg:` breakpoints
- **Acessibilidade**: Usa componentes Radix UI
- **Animações**: Tailwind CSS animations
- **Notificações**: Sonner toasts para feedback ao usuário

---

## 🚀 Próximos Passos para Integração

1. ✅ Criar schema do banco de dados PostgreSQL
2. ✅ Implementar backend (Node.js/Express, Django, FastAPI, etc.)
3. ✅ Substituir localStorage por chamadas API
4. ✅ Implementar autenticação
5. ✅ Adicionar testes (frontend já tem vitest configurado)
6. ✅ Deploy (frontend em Vercel/Netlify, backend em Heroku/Railway/VPS)

---

## 📝 Notas Importantes

- **Persistência atual**: localStorage (dados perdidos ao limpar cache)
- **Sem autenticação**: Todos os dados são públicos
- **Sem validação backend**: Só há validação no frontend
- **Schema SQL vazio**: Precisa ser criado com tabelas e relações

---

## 🔐 .gitignore Criado

Um `.gitignore` abrangente foi criado na raiz do projeto para proteger:
- Arquivos `.sql`
- Arquivos `.env` (variáveis sensíveis)
- Chaves e certificados
- Arquivos de configuração local
- Tokens e API keys

