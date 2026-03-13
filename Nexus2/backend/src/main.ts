// @ts-nocheck
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Security headers via Helmet equivalent
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Nexus API')
    .setDescription('API para gestão de base de conhecimento com integração n8n')
    .setVersion('1.0')
    .addTag('auth', 'Autenticação')
    .addTag('users', 'Gestão de usuários')
    .addTag('files', 'Gestão de arquivos')
    .addTag('ingestion', 'Gestão de ingestão')
    .addTag('knowledge', 'Base de conhecimento')
    .addTag('audit', 'Logs de auditoria')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 4001;
  await app.listen(port);

  const logger = new Logger('bootstrap');
  logger.log(`🚀 Nexus API rodando em http://localhost:${port}`);
  logger.log(`📚 Documentação: http://localhost:${port}/api/docs`);
}

bootstrap();
