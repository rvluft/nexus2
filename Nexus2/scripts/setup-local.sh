#!/usr/bin/env bash
# Setup local do Nexus (sem Docker)

set -e

echo "=== Nexus Local Setup ===="

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js não encontrado. Instale Node.js 18+ e tente novamente."
  exit 1
fi

# 2. Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi

# 3. Verificar se PostgreSQL está rodando
echo "🗄️  Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "⚠️  PostgreSQL não encontrado. Você pode:"
  echo "   a) Instalar PostgreSQL local"
  echo "   b) Usar Docker: docker run -p 5432:5432 -e POSTGRES_PASSWORD=nexus supabase/postgres:15.3.0"
  exit 1
fi

# 4. Criar banco e schema
echo "🗄️  Configurando banco de dados..."
DB_NAME=nexus
DB_USER=nexus
DB_PASS=nexus

# Criar usuário e banco (requer sudo/root)
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true

# Executar schema
sudo -u postgres psql -d ${DB_NAME} -f ../scripts/init.sql

echo "✅ Banco configurado: ${DB_NAME}"

# 5. Instalar dependências do frontend
echo "📦 Instalando dependências do frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "✅ Setup completo!"
echo ""
echo "🚀 Para iniciar:"
echo "   Backend: cd backend && npm run start:dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🔗 Acesse: http://localhost:5173"
echo "📚 API Docs: http://localhost:4001/api/docs"
echo "👤 Login: admin@nexus.local / admin123"
