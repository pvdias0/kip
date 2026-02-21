## ⚙️ Configurando PM2 para Rodaar Front + Back em Um Processo

O projeto KIP agora está configurado para rodar **frontend e backend em um único processo do PM2**.

### 📋 Como Funciona

1. ✅ **Frontend é buildado** (`npm run build`) e gera arquivos estáticos em `frontend/dist`
2. ✅ **Backend Express serve** esses arquivos estáticos
3. ✅ **PM2 gerencia apenas o backend** (que inclui o frontend)

---

## 🚀 Opção 1: Script Automatizado (Recomendado)

### No Windows:

```cmd
start.bat
```

### No Linux/Mac:

```bash
chmod +x start.sh
./start.sh
```

Este script faz tudo automaticamente:

- ✅ Instala dependências do frontend
- ✅ Faz build do frontend
- ✅ Instala dependências do backend
- ✅ Inicia com PM2

---

## 🛠️ Opção 2: Passo-a-Passo Manual

Se preferir fazer manualmente:

### 1️⃣ Instalar dependências do frontend

```cmd
cd frontend
npm install
```

### 2️⃣ Build do frontend

```cmd
npm run build
```

_Isso gera os arquivos estáticos em `frontend/dist`_

### 3️⃣ Instalar dependências do backend

```cmd
cd ../backend
npm install
```

### 4️⃣ Voltar para raiz e iniciar com PM2

```cmd
cd ..
pm2 start ecosystem.config.cjs
```

---

## 📊 Monitorar o Processo

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs kip-full

# Monitor com dashboard
pm2 monit

# Ver logs histórico
pm2 logs kip-full --lines 100
```

---

## 🔧 Configurações do PM2 (ecosystem.config.cjs)

```javascript
{
  name: "kip-full",              // Nome do processo
  script: "backend/src/index.js", // Arquivo principal
  env: {
    NODE_ENV: "production",
    PORT: 3000
  },
  max_memory_restart: "512M"     // Reinicia se ultrapassar 512MB
}
```

---

## ⚠️ Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/`:

```env
NODE_ENV=production
PORT=3000
DB_HOST=seu_host
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
JWT_SECRET=sua_chave_jwt
```

---

## 🔄 Atualizações Futuras

Quando atualizar o frontend:

```bash
cd frontend
npm run build
cd ..
pm2 restart kip-full
```

---

## ❌ Parar o Projeto

```bash
pm2 stop kip-full    # Pausar
pm2 restart kip-full # Reiniciar
pm2 delete kip-full  # Remover
```

---

## 💡 Por Que Funciona em Um Só Processo?

- O **frontend é estático** (HTML, CSS, JS pré-compilado)
- O **backend Express serve** os arquivos estáticos (middleware `app.use(express.static(...))`)
- A **API continua funcionando** normalmente em `/api/*`
- **Socket.IO** também funciona na mesma porta

Isso é muito mais eficiente que rodar dois processos separados! ✅
