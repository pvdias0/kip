# 💰 KIP - Organizador Financeiro

<div align="center">

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)](https://www.postgresql.org/)

Um aplicativo web moderno e responsivo para gerenciamento e organização de despesas pessoais com interface intuitiva e análises em tempo real.

[🔥 Features](#features) • [🚀 Quick Start](#quick-start) • [📋 Requisitos](#requisitos) • [🛠️ Stack Tecnológico](#stack-tecnológico) • [📁 Estrutura do Projeto](#estrutura-do-projeto)

</div>

---

## 📝 Sobre o Projeto

O **KIP** é uma solução completa para gerenciar suas finanças pessoais. Com uma interface limpa e intuitiva, você pode categorizar despesas, visualizar gráficos de gastos, acompanhar padrões de consumo e obter insights sobre seus hábitos financeiros.

A aplicação foi desenvolvida com as melhores práticas de desenvolvimento web moderno, oferecendo performance otimizada, segurança robusta e uma experiência de usuário superior.

---

## 🔥 Features

### 📊 Dashboard Inteligente

- Visualização em tempo real de gastos mensais
- Gráficos interativos de distribuição de categorias
- Resumo de gastos por período (diário, semanal, mensal)
- Ranking de categorias mais gastas
- Navegação por meses com previsualizações

### 🏷️ Gerenciamento de Categorias

- Criar, editar e deletar categorias personalizadas
- Categorias padrão pré-configuradas
- Associação automática de transações às categorias

### 💳 Registro de Transações

- Interface simples para registrar despesas
- Seleção de categorias intuitiva
- Data, valor e descrição personalizáveis
- Histórico completo de transações

### 🔐 Autenticação Segura

- Sistema de login e registro robusto
- Autenticação baseada em JWT (JSON Web Tokens)
- Recuperação de senha via email
- Senhas criptografadas com bcrypt

### 📱 Interface Responsiva

- Design mobile-first
- Funciona perfeitamente em desktop, tablet e dispositivos móveis
- Interface limpa e moderna com Tailwind CSS

### ⚡ Atualizações em Tempo Real

- WebSocket (Socket.io) para sincronização instantânea
- Atualizações de categorias e transações sem precisar recarregar

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+ instalado
- PostgreSQL 14+ instalado e em execução
- npm ou yarn como gerenciador de pacotes
- Git

### Instalação

#### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/kip.git
cd kip
```

#### 2. Configure o Backend

```bash
cd backend

# Instale as dependências
npm install

# Crie um arquivo .env baseado no .env.example
cp .env.example .env

# Configure as variáveis de ambiente no arquivo .env
# Exemplo:
# DATABASE_URL=postgresql://usuario:senha@localhost:5432/kip
# PORT=3000
# JWT_SECRET=sua-chave-secreta-muito-segura
# NODE_ENV=development

# Execute as migrações do banco de dados
npm run migrate

# Inicie o servidor (modo desenvolvimento com hot-reload)
npm run dev

# Ou para produção
npm start
```

#### 3. Configure o Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Crie um arquivo .env com as variáveis necessárias
cp .env.example .env

# Configure a URL do backend no arquivo .env
# Exemplo:
# VITE_API_URL=http://localhost:3000/api

# Inicie o servidor de desenvolvimento
npm run dev

# Ou faça o build para produção
npm run build
```

#### 4. Acesse a aplicação

A aplicação estará disponível em: `http://localhost:5173`

---

## 📋 Requisitos

### Backend

- [Node.js](https://nodejs.org/) >= 20
- [PostgreSQL](https://www.postgresql.org/) >= 14
- npm ou yarn

### Frontend

- [Node.js](https://nodejs.org/) >= 20
- npm ou yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

---

## 🛠️ Stack Tecnológico

### Frontend

- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-rápido
- **Tailwind CSS** - Utility-first CSS framework
- **ShadcN/UI** - Componentes React de alta qualidade
- **React Router** - Roteamento SPA
- **TanStack Query** - Gerenciamento de dados
- **React Hook Form** - Gerenciamento de formulários
- **Vitest** - Testes unitários e de integração
- **Socket.io Client** - Comunicação em tempo real
- **Lucide React** - Ícones

### Backend

- **Node.js** - Runtime JavaScript
- **Express 5** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **Socket.io** - Comunicação WebSocket em tempo real
- **JWT** - Autenticação stateless
- **Bcrypt** - Hash de senhas
- **Cors** - Controle de origem cruzada
- **Helmet** - Segurança HTTP
- **Express Validator** - Validação de dados

---

## 📁 Estrutura do Projeto

```
kip/
├── backend/                      # API REST e WebSocket
│   ├── src/
│   │   ├── index.js             # Ponto de entrada da aplicação
│   │   ├── config/
│   │   │   └── database.js      # Configuração PostgreSQL
│   │   ├── controllers/         # Lógica de negócio
│   │   │   ├── authController.js
│   │   │   ├── categoryController.js
│   │   │   ├── entryController.js
│   │   │   └── passwordResetController.js
│   │   ├── middleware/          # Middlewares Express
│   │   │   └── auth.js          # Autenticação JWT
│   │   ├── routes/              # Definição de rotas
│   │   ├── utils/               # Utilitários
│   │   │   ├── jwt.js
│   │   │   ├── password.js
│   │   │   ├── email.js
│   │   │   └── socket.js
│   │   ├── scripts/             # Scripts de migração
│   │   └── socket/              # Gerenciamento WebSocket
│   ├── package.json
│   └── .env.example
│
├── frontend/                     # Aplicação React
│   ├── src/
│   │   ├── main.tsx             # Ponto de entrada
│   │   ├── App.tsx              # Componente raiz
│   │   ├── components/          # Componentes React
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── CategoryChart.tsx
│   │   │   ├── DailyStats.tsx
│   │   │   └── ui/              # Componentes ShadcN/UI
│   │   ├── pages/               # Páginas (rotas)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── CategoryManagement.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── ResetPassword.tsx
│   │   ├── hooks/               # Custom Hooks
│   │   │   ├── useTransactions.ts
│   │   │   ├── useSocket.ts
│   │   │   └── useCategories.ts
│   │   ├── contexts/            # Context API
│   │   │   └── AuthContext.tsx
│   │   ├── services/            # Chamadas API
│   │   │   └── api.ts
│   │   ├── types/               # TypeScript types
│   │   └── test/                # Testes
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
└── README.md                     # Este arquivo
```

---

## 🔄 Fluxo de Dados

```
Frontend (React)
    ↓ HTTP / WebSocket
Backend (Express + Socket.io)
    ↓
PostgreSQL Database
    ↓
Persistência de Dados
```

---

## 🔐 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Autenticação JWT segura
- ✅ Validação de dados em backend e frontend
- ✅ CORS configurado restritivamente
- ✅ Helmet para proteção de headers HTTP
- ✅ Variáveis de ambiente para dados sensíveis
- ✅ Sanitização de inputs

---

## 📚 Scripts Disponíveis

### Backend

```bash
npm start          # Inicia o servidor em produção
npm run dev        # Inicia em modo desenvolvimento com hot-reload
npm run migrate    # Executa migrações do banco de dados
```

### Frontend

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Build para produção
npm run preview    # Visualiza o build de produção localmente
npm run lint       # Verifica código com ESLint
npm test           # Executa testes
npm run test:watch # Executa testes em modo watch
```

---

## 🌍 Variáveis de Ambiente

### Backend (.env)

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/kip

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRE=7d

# Email (para recuperação de senha)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## 🐛 Troubleshooting

### Problema: Erro de conexão com banco de dados

**Solução:** Verifique se o PostgreSQL está rodando e se as credenciais no .env estão corretas.

### Problema: CORS error ao conectar frontend com backend

**Solução:** Verifique a URL do backend no .env do frontend e confirme se está sem trailing slash.

### Problema: WebSocket não conecta

**Solução:** Confira se a URL do Socket.io está correta e se o backend está rodando.

### Problema: npm install falha

**Solução:** Delete `node_modules` e `package-lock.json`, depois execute `npm install` novamente.

---

## 🚀 Deploy

### Deployment no Vercel (Frontend)

```bash
npm install -g vercel
vercel login
vercel deploy
```

### Deployment no Heroku/Railway (Backend)

Consulte a documentação específica de cada plataforma para instruções detalhadas.

---

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📧 Contato

Para dúvidas ou sugestões, por favor abra uma [issue](https://github.com/seu-usuario/kip/issues) no GitHub.

---

## 📊 Status do Projeto

- ✅ Versão 1.0 - Funcionalidades core implementadas
- 🚧 Em desenvolvimento - Novas features sendo adicionadas
- 🔄 Melhorias contínuas - Bug fixes e otimizações

---

<div align="center">

**[⬆ Voltar ao topo](#-kip---organizador-financeiro)**

</div>
