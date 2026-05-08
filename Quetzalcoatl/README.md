# Quetzalcoatl

Central de memoria operacional para IA, construida com Next.js full-stack, Prisma e PostgreSQL.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS
- Prisma ORM + PostgreSQL
- Zod + React Hook Form
- TanStack Query

## Setup local

1. Instale dependencias: `npm install`
2. Copie variaveis: `cp .env.example .env`
3. Ajuste `DATABASE_URL` no `.env`.
4. Rode migracoes: `npm run db:migrate`
5. Rode seed: `npm run db:seed`
6. Inicie: `npm run dev`

## Scripts

- `npm run dev` - servidor local
- `npm run lint` - lint
- `npm run test` - testes
- `npm run build` - build de producao
- `npm run db:generate` - gerar Prisma Client
- `npm run db:migrate` - aplicar migracoes de desenvolvimento
- `npm run db:migrate:deploy` - aplicar migracoes em producao
- `npm run db:seed` - popular banco com dados iniciais

## Deploy

- Aplicacao: Vercel (recomendado) ou container em VPS.
- Banco: PostgreSQL gerenciado (Neon/Supabase/RDS).
- Pipeline: GitHub Actions em `.github/workflows/ci.yml`.
- Em producao, execute `npm run db:migrate:deploy` antes de subir o novo release.

## Backups e operacao

- Habilitar backup diario do PostgreSQL e restauracao testada.
- Monitorar erros de aplicacao e latencia de API.
