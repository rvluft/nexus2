# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=prod

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --include=prod && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs storage/uploads

EXPOSE 4001

CMD ["node", "dist/main"]
