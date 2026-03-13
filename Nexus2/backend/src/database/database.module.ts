// @ts-nocheck
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresService } from './postgres.service';

@Module({
  providers: [PostgresService, ConfigService],
  exports: [PostgresService],
})
export class DatabaseModule {}
