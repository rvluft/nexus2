// @ts-nocheck
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { N8nController } from './n8n.controller';
import { N8nService } from '../../integrations/n8n/n8n.service';
import { DatabaseModule } from '../../database/database.module';
import { IngestionService } from '../ingestion/ingestion.service';
import { AppConfigModule } from '../app-config/config.module';

@Module({
  imports: [HttpModule, DatabaseModule, AppConfigModule],
  controllers: [N8nController],
  providers: [N8nService, IngestionService],
  exports: [N8nService],
})
export class N8nModule {}
