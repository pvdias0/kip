@echo off
REM Script para iniciar o projeto KIP com Docker Compose (Windows)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  Subindo o projeto KIP com Docker Compose...
echo ========================================
echo.

docker compose up --build -d
if errorlevel 1 (
    echo Erro ao subir os containers
    exit /b 1
)

echo.
echo ========================================
echo  Stack iniciada com sucesso!
echo ========================================
echo.
echo Aplicacao: http://localhost:8080
echo Health check: http://localhost:8080/api/health
echo Banco: localhost:5432
echo.
