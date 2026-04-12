#!/bin/bash

# Script para iniciar o projeto KIP com Docker Compose

set -e

echo "Subindo frontend, api e banco com Docker Compose..."
docker compose up --build -d

echo "Stack iniciada com sucesso."
echo "Aplicacao: http://localhost:8080"
echo "Health check: http://localhost:8080/api/health"
echo "Banco: localhost:5432"
