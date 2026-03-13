// Script para verificar se todas as dependências estão corretas
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando estrutura do projeto Nexus2...\n');

const checks = [
  { file: 'package.json', desc: 'package.json' },
  { file: 'tsconfig.json', desc: 'TypeScript config' },
  { file: 'src/main.ts', desc: 'Entry point' },
  { file: 'src/app.module.ts', desc: 'App module' },
  { file: 'src/database/postgres.service.ts', desc: 'Postgres service' },
  { file: 'src/modules/auth/auth.module.ts', desc: 'Auth module' },
  { file: 'src/modules/users/users.module.ts', desc: 'Users module' },
  { file: 'src/modules/files/files.module.ts', desc: 'Files module' },
  { file: 'src/modules/ingestion/ingestion.module.ts', desc: 'Ingestion module' },
  { file: 'src/modules/knowledge/knowledge.module.ts', desc: 'Knowledge module' },
  { file: 'src/modules/audit/audit.module.ts', desc: 'Audit module' },
  { file: '.env', desc: 'Environment variables' },
];

let errors = 0;

checks.forEach(check => {
  const fullPath = path.join(__dirname, check.file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${check.desc}`);
  } else {
    console.log(`❌ ${check.desc} - FALTA`);
    errors++;
  }
});

console.log('\n📦 Verificando dependências...');
try {
  execSync('npm ls --depth=0', { stdio: 'inherit' });
} catch (e) {
  console.log('⚠️  Algumas dependências podem estar faltando. Rode: npm install');
}

console.log(`\n${errors === 0 ? '✅ Tudo ok!' : `❌ ${errors} arquivos faltantes`}`);
console.log('\nPróximos passos:');
console.log('1. npm install (no backend)');
console.log('2. docker-compose -f docker-compose.dev.yml up -d');
console.log('3. Acesse http://localhost:5173');
