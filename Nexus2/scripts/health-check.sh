#!/usr/bin/env bash
# Health check do Nexus (para Docker / monitoramento)

set -e

 API_URL=${1:-http://localhost:4001/health}

echo "🔍 Verificando saúde da API Nexus..."
echo "   URL: $API_URL"

 RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

 if [ "$RESPONSE" = "200" ]; then
   echo "✅ API está saudável (HTTP $RESPONSE)"
   exit 0
 else
   echo "❌ API retornou HTTP $RESPONSE"
   exit 1
 fi
