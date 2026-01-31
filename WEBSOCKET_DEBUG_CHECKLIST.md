# WebSocket Debug Checklist

## ✅ Alterações Implementadas

### Backend (`src/utils/socket.js`)
- [x] **CORS Sincronizado**: Agora aceita as mesmas origens do Express
  - `https://kip.kler.app.br` (produção)
  - `http://localhost:3000` (desenvolvimento)
  - `http://localhost:8080` (dev alternativo)

- [x] **Transports**: Suporta WebSocket + HTTP Polling
  - WebSocket: mais eficiente
  - Polling: fallback para ambientes com firewall

- [x] **Ping/Pong**: Mantém conexão viva
  - `pingInterval: 25s`
  - `pingTimeout: 20s`

- [x] **Logging Melhorado**: Saber exatamente o que está acontecendo
  ```
  [Socket] 📤 Emitting "transaction:created" to user 123
  [Socket] ✅ Event "transaction:created" emitted to user 123
  ```

### Frontend (`src/hooks/useSocket.ts`)
- [x] **URL Dinâmica**: Detecta automaticamente o ambiente
  - `localhost` → `http://localhost:3000`
  - Produção → `window.location.origin`

- [x] **Logging de Conexão**
  ```
  [Socket] 🔗 Conectando em: http://localhost:3000
  [Socket] ✅ Conectado com sucesso! socket_id_abc123
  [Socket] ❌ Erro de conexão: ...
  ```

### Frontend (`src/hooks/useTransactions.ts`)
- [x] **Logging de Eventos**
  ```
  [Transactions] 🎧 Escutando eventos de WebSocket...
  [Transactions] 🆕 Nova transação recebida via socket: {...}
  ```

---

## 🧪 Como Testar Localmente

### Passo 1: Iniciar Backend
```bash
cd backend
npm install
node start-backend.bat  # Windows
# ou: npm start
```

**Esperado no console:**
```
[Socket] 🔍 Middleware - verificando autenticação...
[Socket] ✅ Usuário 123 autenticado com sucesso
[Socket] ✅ Usuário autenticado 123 conectado: socket_id_xyz
```

### Passo 2: Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```

**Esperado no console (F12):**
```
[Socket] 💻 Ambiente de desenvolvimento detectado
[Socket] 🔗 Conectando em: http://localhost:3000
[Socket] ✅ Conectado com sucesso! socket_id_abc123
[Transactions] 🎧 Escutando eventos de WebSocket...
```

### Passo 3: Criar Transação
1. Abra DevTools (F12) → Console
2. Login no aplicativo
3. Crie uma nova transação
4. **Procure pelos logs:**

**Backend Console:**
```
[Socket] 📤 Emitting "transaction:created" to user 123
{id: 456, type: 'income', amount: 100, ...}
[Socket] ✅ Event "transaction:created" emitted to user 123
```

**Frontend Console:**
```
[Transactions] 🆕 Nova transação recebida via socket:
{id: 456, type: 'income', amount: 100, ...}
```

**UI:**
✅ Transação aparece **imediatamente** na lista sem recarregar

---

## 🔍 Troubleshooting

### Problema: Socket não conecta (ERR_NAME_NOT_RESOLVED)
```
❌ GET https://kip-backend.kler.app.br/socket.io/
    net::ERR_NAME_NOT_RESOLVED
```

**Solução:**
- [x] Verificar CORS no backend (sync com Express)
- [x] Verificar URL do frontend (deve ser dinâmica agora)
- Limpar cache do browser (Ctrl+Shift+Del)

### Problema: Token não reconhecido
```
❌ [Socket] Token não fornecido na conexão
```

**Solução:**
- Fazer login no aplicativo
- Token deve estar em `localStorage.getItem('auth_token')`
- Verificar se token é válido (não expirado)

### Problema: Transação criada mas não atualiza
```
✅ POST /api/entries → 201
❌ Nenhum log [Transactions] 🆕
```

**Solução:**
1. Backend emitiu? Verificar logs:
   ```
   [Socket] 📤 Emitting "transaction:created"
   ```

2. Frontend escutando? Verificar:
   ```
   [Transactions] 🎧 Escutando eventos
   ```

3. Socket conectado? Verificar:
   ```
   [Socket] ✅ Conectado com sucesso!
   isConnected = true
   ```

### Problema: Muitos logs, difícil debugar
**Solução:** Filtrar no console do browser:
- Escrever `[Socket]` na caixa de filtro
- Ou `[Transactions]` para só transações

---

## 📊 Fluxo Esperado de Atualização em Tempo Real

```
1. Frontend: Usuário clica "Criar Transação"
   └─→ [Transactions] Fazendo POST /api/entries
   
2. Backend: Recebe POST
   └─→ Salva no banco de dados
   └─→ [Socket] 📤 Emitting "transaction:created" to user 123
   
3. WebSocket: Envia evento
   └─→ io.to('user_123').emit('transaction:created', {...})
   
4. Frontend: Recebe evento
   └─→ [Transactions] 🆕 Nova transação recebida via socket
   └─→ setTransactions([nova, ...prev])
   
5. UI: React re-renderiza
   └─→ ✅ Nova transação aparece no topo da lista
   
⏱️ Tempo total: ~100-200ms (em tempo real!)
```

---

## ✨ Próximos Passos (Opcional)

- [ ] Implementar notificações toast quando transação é criada
- [ ] Sincronizar stats em tempo real (já emitindo, só falta listener)
- [ ] Adicionar indicador visual de "Conectado/Desconectado"
- [ ] Persistir logs em arquivo para debugging em produção

---

**Status**: ✅ IMPLEMENTADO - Pronto para testar

