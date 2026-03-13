// @ts-nocheck
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(PostgresService.name);

  constructor(private configService: ConfigService) {
    const dbHost = this.configService.get('DB_HOST') || 'postgres';
    const dbPort = this.configService.get('DB_PORT') || 5432;
    const dbName = this.configService.get('DB_DATABASE') || 'nexus';
    const dbUser = this.configService.get('DB_USERNAME') || 'nexus';
    const dbPass = this.configService.get('DB_PASSWORD') || 'nexus';

    this.pool = new Pool({
      host: dbHost,
      port: parseInt(dbPort, 10),
      database: dbName,
      user: dbUser,
      password: dbPass,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  onModuleInit() {
    this.logger.log('Postgres pool initialized');
  }

  onModuleDestroy() {
    this.pool.end();
    this.logger.log('Postgres pool closed');
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount || 0 };
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
