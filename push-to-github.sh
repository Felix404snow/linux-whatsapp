#!/bin/bash

# Script automático para enviar o WhatsApp Linux pro GitHub
# Uso: ./push-to-github.sh

set -e

cd "$(dirname "$0")"

REPO_NAME="whatsapp-linux"

echo "🚀 WhatsApp Linux - Push para GitHub"
echo ""

# Verifica se tem git
if ! command -v git &> /dev/null; then
    echo "❌ Git não encontrado. Instale com: sudo apt install git"
    exit 1
fi

# Pergunta o usuário do GitHub
if [ -z "$GITHUB_USER" ]; then
    read -p "👤 Seu usuário do GitHub (ex: felix404snow): " GITHUB_USER
fi

if [ -z "$GITHUB_USER" ]; then
    echo "❌ Usuário do GitHub é obrigatório"
    exit 1
fi

# Configura git se não tiver
if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
    git config --global user.name "$GITHUB_USER"
fi
if [ -z "$(git config --global user.email 2>/dev/null)" ]; then
    git config --global user.email "${GITHUB_USER}@users.noreply.github.com"
fi

# Inicializa o repositório
if [ ! -d ".git" ]; then
    git init
    echo "✅ Repositório git inicializado"
fi

# Adiciona tudo e faz commit
git add .
if git diff --cached --quiet; then
    echo "⚠️  Nada de novo para commitar"
else
    git commit -m "WhatsApp Linux - first commit 🚀"
    echo "✅ Commit feito"
fi

# Cria o repositório no GitHub via API
echo ""
echo "🔧 Criando repositório no GitHub..."

# Tenta com gh CLI primeiro
if command -v gh &> /dev/null; then
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push 2>/dev/null && {
        echo "✅ Repo criado e push feito via gh CLI!"
        echo ""
        echo "🎉 Pronto! Acesse: https://github.com/$GITHUB_USER/$REPO_NAME"
        exit 0
    }
fi

# Se gh falhou, cria via API e pusha com git
read -s -p "🔑 Cole seu token do GitHub (ou Enter se já tiver autenticação): " TOKEN
echo ""

if [ -n "$TOKEN" ]; then
    curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token $TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/user/repos \
        -d "{\"name\":\"$REPO_NAME\",\"private\":false}" | grep -q "20[0-9]" && {
        echo "✅ Repositório criado no GitHub"
    } || {
        echo "⚠️  Repositório já existe ou erro na criação (continuando...)"
    }
    REMOTE_URL="https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
else
    REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

# Configura remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

# Push
git branch -M main
git push -u origin main

echo ""
echo "🎉 Pronto! Seu código está no GitHub:"
echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
