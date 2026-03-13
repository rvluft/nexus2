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
import { ConfigModule as NexusConfigModule } from './modules/config/config.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

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
    NexusConfigModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
