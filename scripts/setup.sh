#!/bin/bash

# ============================================
# GESTORE INTERROGAZIONI SCOLASTICHE
# Script di Setup Automatico
# ============================================

set -e

echo "🚀 Setup Gestore Interrogazioni Scolastiche"
echo "============================================"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica prerequisiti
echo ""
echo "📋 Verifica prerequisiti..."

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installa Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ richiesto. Versione trovata: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 non trovato. Installa Python 3.9+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python $(python3 --version)${NC}"

# PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL client non trovato. Assicurati di avere un database PostgreSQL disponibile.${NC}"
fi

# Directory del progetto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📁 Directory progetto: $PROJECT_DIR"

# Setup Backend
echo ""
echo "🔧 Setup Backend (Node.js)..."
cd "$PROJECT_DIR/backend"

if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install
else
    echo "✅ Dipendenze già installate"
fi

echo -e "${GREEN}✅ Backend configurato${NC}"

# Setup Auth Service
echo ""
echo "🔧 Setup Auth Service (Flask)..."
cd "$PROJECT_DIR/auth-service"

if [ ! -d "venv" ]; then
    echo "🐍 Creazione virtual environment..."
    python3 -m venv venv
fi

echo "📦 Installazione dipendenze..."
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo -e "${GREEN}✅ Auth Service configurato${NC}"

# Setup Environment
echo ""
echo "⚙️  Configurazione ambiente..."
cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creazione file .env da .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Ricordati di modificare il file .env con le tue configurazioni!${NC}"
    fi
else
    echo "✅ File .env già esistente"
fi

# Database
echo ""
echo "🗄️  Configurazione Database..."
echo -e "${YELLOW}Assicurati di avere un database PostgreSQL disponibile.${NC}"
echo "Se st usando Render.com, crea il database dal dashboard."
echo ""
echo "Per inizializzare il database localmente:"
echo "  1. Crea il database: createdb gestore_interrogazioni"
echo "  2. Esegui: npm run db:init"

# Istruzioni finali
echo ""
echo "============================================"
echo -e "${GREEN}✅ Setup completato!${NC}"
echo ""
echo "Per avviare l'applicazione in sviluppo:"
echo ""
echo "1. Terminal 1 - Backend:"
echo "   cd backend && npm run dev"
echo ""
echo "2. Terminal 2 - Auth Service:"
echo "   cd auth-service && source venv/bin/activate && flask run --port=5000"
echo ""
echo "3. Apri frontend/index.html nel browser"
echo "   Oppure usa: npx serve frontend"
echo ""
echo "============================================"
