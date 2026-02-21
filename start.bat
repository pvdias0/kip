@echo off
REM Script para preparar e iniciar o projeto KIP em produção (Windows)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  Preparando o projeto KIP...
echo ========================================
echo.

REM 1. Instalar dependências do frontend
echo [1/5] Instalando dependências do frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências do frontend
    exit /b 1
)

REM 2. Build do frontend
echo [2/5] Fazendo build do frontend...
call npm run build
if errorlevel 1 (
    echo ❌ Erro ao fazer build do frontend
    exit /b 1
)

REM 3. Voltar para backend e instalar dependências
cd ..
echo [3/5] Instalando dependências do backend...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Erro ao instalar dependências do backend
    exit /b 1
)

REM 4. Voltar para raiz
cd ..

echo [4/5] Criando diretório de logs...
if not exist logs mkdir logs

echo.
echo ========================================
echo  ✅ Preparação concluída!
echo ========================================
echo.
echo [5/5] Iniciando com PM2...
call pm2 start ecosystem.config.cjs

echo.
echo ========================================
echo  ✅ Projeto iniciado com sucesso!
echo ========================================
echo.
echo Para monitorar:
echo   pm2 monit
echo   pm2 logs kip-full
echo   pm2 status
echo.
