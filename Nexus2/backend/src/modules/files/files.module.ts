// @ts-nocheck
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { DatabaseModule } from '../../database/database.module';
import { MulterModule } from '@nestjs/platform-express';
import { N8nFilesService } from './n8n-files.service';
import { N8nWebhookController } from './n8n-webhook.controller';
import { N8nConfigController } from './n8n-config.controller';
import { StorageController } from './storage.controller';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
    HttpModule,
  ],
  controllers: [FilesController, N8nWebhookController, N8nConfigController, StorageController],
  providers: [FilesService, N8nFilesService],
  exports: [FilesService],
})
export class FilesModule {}
