#!/bin/bash

# Script para preparar e iniciar o projeto KIP em produção
# Este script faz build do frontend e inicia o backend com PM2

set -e

echo "🔨 Preparando o projeto KIP..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Instalar dependências do frontend
echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
cd frontend
npm install
# ou use: pnpm install / yarn install se preferir

# 2. Build do frontend
echo -e "${YELLOW}🏗️  Fazendo build do frontend...${NC}"
npm run build

# 3. Voltar para raiz e instalar dependências do backend
cd ..
echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd backend
npm install

# 4. Voltar para raiz para iniciar com PM2
cd ..

echo -e "${GREEN}✅ Preparação concluída!${NC}"
echo -e "${YELLOW}🚀 Iniciando com PM2...${NC}"

# 5. Iniciar com PM2
pm2 start ecosystem.config.cjs

echo -e "${GREEN}✅ Projeto iniciado com sucesso!${NC}"
echo -e "${YELLOW}Para monitorar:${NC}"
echo "   pm2 monit"
echo "   pm2 logs"
echo "   pm2 status"
