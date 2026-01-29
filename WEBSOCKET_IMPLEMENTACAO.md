# WebSocket - Implementação em Tempo Real

## 📋 O Que Foi Implementado

Sistema de WebSocket com Socket.io para atualizações **em tempo real** de:
- ✅ Transações (criar, atualizar, deletar)
- ✅ Dashboards e Rankings
- ✅ Valores totalizados

## 🔧 Arquivos Criados/Atualizados

### Backend

**`src/socket/socketManager.js`** (NOVO)
- Gerenciador de conexões WebSocket
- Autenticação via JWT no handshake
- Mapeamento de usuários conectados
- Emissão de eventos para usuários específicos

**`src/utils/socket.js`** (ATUALIZADO)
- Inicialização do Socket.io com CORS e JWT
- Funções para emitir eventos:
  - `emitToUser(userId, event, data)` - Emitir para um usuário
  - `emitTransactionCreated(userId, transaction)` - Nova transação
  - `emitTransactionUpdated(userId, transaction)` - Transação atualizada
  - `emitTransactionDeleted(userId, transactionId)` - Transação deletada
  - `emitStatsUpdated(userId, stats)` - Estatísticas atualizadas

**`src/index.js`** (ATUALIZADO)
- Importar `initializeSocket` de `socket/socketManager.js`
- Usar `http.createServer(app)` ao invés de app direto
- Passar httpServer para `initializeSocket()`
- Listen no httpServer com WebSocket + HTTP

**`src/controllers/entryController.js`** (JÁ INTEGRADO)
- Chama `emitTransactionCreated()` após criar entrada
- Chama `emitTransactionUpdated()` após atualizar
- Chama `emitTransactionDeleted()` após deletar

### Frontend

**`src/hooks/useSocket.ts`** (NOVO)
- Hook de gerenciamento de conexão WebSocket
- Autenticação automática via JWT token
- Sistema de listeners com `on()` e `emit()`
- Reconexão automática
- Status de conexão

**`src/hooks/useTransactions.ts`** (ATUALIZADO)
- Integração com `useSocket`
- Listeners para eventos de transação:
  - `transaction:created` - Adiciona à lista
  - `transaction:updated` - Atualiza no estado
  - `transaction:deleted` - Remove da lista
- Remove necessidade de `fetchTransactions()` após operações

**`.env.local`** (NOVO)
- `VITE_SOCKET_URL=http://localhost:3000`

## 🔄 Fluxo de Funcionamento

### 1️⃣ Conexão Inicial
```
Frontend conecta com socket.io
↓
Envia token JWT no auth
↓
Backend valida token
↓
Usuario autenticado entra em sala: user_{userId}
```

### 2️⃣ Criação de Transação
```
User A: Cria transação via formulário
↓
POST /api/entries
↓
Backend cria no DB
↓
emitTransactionCreated(userId, entry)
↓
Socket emite para user_{userId}
↓
User A: Lista atualiza automaticamente
↓
Se User B estiver logado mesma conta:
  ↓
  User B: Vê a transação aparecer em tempo real
```

### 3️⃣ Atualização de Transação
```
PUT /api/entries/{id}
↓
emitTransactionUpdated(userId, updatedEntry)
↓
Todos usuários dessa conta: Veem mudança em tempo real
```

### 4️⃣ Deleção de Transação
```
DELETE /api/entries/{id}
↓
emitTransactionDeleted(userId, entryId)
↓
Frontend recebe e remove da lista automaticamente
```

## 📊 Dashboard em Tempo Real

Como os dados mudam via WebSocket:
- **Saldo Total** recalculado automaticamente
- **Gráficos** (Recharts) atualizam com novo dataset
- **Resumo da Semana** recalculado
- **Ranking de Categorias** atualizado
- **Transações Recentes** aparecem no topo

## 🔐 Segurança

✅ **JWT na Conexão**
- Token validado no handshake
- Desconexão se token inválido
- Erro se token expirado

✅ **Isolamento de Usuários**
- Cada usuário em sala `user_{userId}`
- Só recebe eventos da sua própria conta
- Impossível "ouvir" eventos de outro usuário

✅ **CORS Configurado**
- Socket.io respeita origem whitelist
- Mesma configuração que HTTP API

## 🚀 Como Usar

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

Agora:
1. Abra 2 abas do navegador
2. Faça login na mesma conta em ambas
3. Crie uma transação em uma aba
4. Veja aparecer na outra aba em tempo real! ⚡

## 📝 Eventos Disponíveis

### Backend → Frontend
- `transaction:created` - Nova transação criada
- `transaction:updated` - Transação modificada
- `transaction:deleted` - Transação removida
- `stats:updated` - Estatísticas atualizadas

### Frontend → Backend
(Pode estender para eventos do cliente se necessário)

## 🔧 Troubleshooting

**Não está em tempo real?**
1. Verifique `.env.local` no frontend: `VITE_SOCKET_URL=http://localhost:3000`
2. Backend rodando: `npm run dev`
3. Console do navegador: Deve ver `[Socket] Conectado ao servidor:`

**CORS Error no Socket?**
- Verificar `src/utils/socket.js`
- `origin` deve ser `http://localhost:8080`

**Token inválido ao conectar?**
- Token pode ter expirado
- Faça novo login
- localStorage.getItem('auth_token') deve ter um valor válido

## 📈 Próximos Passos Opcionais

1. **Notificações**: Adicionar toast ao receber eventos
2. **Typing Indicator**: Mostrar quem está editando
3. **Múltiplos Dispositivos**: Sincronizar entre dispositivos
4. **Histórico**: Log de ações em tempo real
