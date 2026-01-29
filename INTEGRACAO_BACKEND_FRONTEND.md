# Integração Backend-Frontend - Resumo das Mudanças

## Arquivos Criados

### 1. `src/services/api.ts`
Serviço centralizado de API que:
- Gerencia todas as requisições HTTP
- Adiciona automaticamente o token JWT no header `Authorization: Bearer <token>`
- Trata erros de forma consistente
- Fornece métodos tipados para cada endpoint

**Métodos disponíveis:**
```
Auth:
- register(username, fullName, password)
- login(username, password)

Categories:
- getCategories()
- getCategoriesByType(type: 'income' | 'expense')

Entries:
- createEntry(data)
- getEntries(filters?)
- getEntryById(id)
- updateEntry(id, data)
- deleteEntry(id)
- getStats(filters?)
```

## Arquivos Atualizados

### 1. `src/contexts/AuthContext.tsx`
**Mudanças:**
- Agora usa `apiService` para fazer requisições
- Adiciona erro handling e estado de erro
- Define o token no apiService ao fazer login/register
- Respeita o novo formato do backend (username em vez de email)

**API do contexto:**
```typescript
useAuth() => {
  user, token, isAuthenticated, login, register, logout, isLoading, error
}
```

### 2. `src/hooks/useTransactions.ts`
**Mudanças:**
- Substitui localStorage por requisições API
- Busca transações do backend ao montar
- Adiciona estado de loading e erro
- `addTransaction` e `deleteTransaction` agora fazem requisições ao backend
- Transforma respostas da API para o formato esperado pelo frontend

**Novos estados:**
```typescript
{
  ...métodos anteriores,
  isLoading: boolean,
  error: string | null
}
```

## Como Funciona a Integração

### Fluxo de Autenticação

1. Usuário preenche formulário de login/registro
2. `useAuth()` chama `apiService.login()` ou `apiService.register()`
3. Backend retorna `{ user, token }`
4. Token é salvo no localStorage e no apiService
5. Requisições futuras incluem `Authorization: Bearer <token>`

### Fluxo de Transações

1. Na montagem, `useTransactions()` chama `apiService.getEntries()`
2. Backend retorna lista de transações do usuário autenticado
3. Transações são armazenadas no estado local (React)
4. Ao adicionar/deletar, backend é atualizado e lista é refetched

## Importante: Mapeamento de Campos

O banco de dados usa campos diferentes:
- `username` (não email) - usar username para login
- `category_id` (número) - frontend converte para string
- `entries` (tabela, não transactions)
- `user_id` - banco associa automaticamente via JWT
- `created_at` (camelCase no frontend: `createdAt`)

## Próximos Passos

1. ✅ Atualizar backend para receber `email` como `username`
2. ✅ Testar fluxo de autenticação
3. ✅ Testar CRUD de transações
4. ✅ Adicionar tratamento de erros melhorado no frontend
5. ✅ Adicionar refresh automático de dados
6. ✅ Implementar paginação (se necessário)

## Notas de Desenvolvimento

- O token JWT expira em 7 dias
- Logout apaga token do localStorage e do apiService
- Todas as requisições às transações requerem autenticação
- O backend filtra transações automaticamente por usuário logado
