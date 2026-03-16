// @ts-nocheck
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AuditModule } from './modules/audit/audit.module';
import { AppConfigModule } from './modules/app-config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { N8nModule } from './modules/n8n/n8n.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DomainsModule } from './modules/domains/domains.module';
import { BlocklistModule } from './modules/blocklist/blocklist.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    FilesModule,
    IngestionModule,
    KnowledgeModule,
    AuditModule,
    AppConfigModule,
    N8nModule,
    MetricsModule,
    DomainsModule,
    BlocklistModule,
    TicketsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
