import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private cache: Map<string, string> = new Map();

  constructor(
    private postgresService: PostgresService,
    private nestConfig: NestConfigService,
  ) {
    this.loadCache();
  }

  private async loadCache() {
    try {
      const { rows } = await this.postgresService.query(
        'SELECT key, value FROM nexus.config'
      );
      this.cache.clear();
      rows.forEach(r => this.cache.set(r.key, r.value));
      this.logger.log(`Config carregada do banco: ${this.cache.size} chaves`);
    } catch (error) {
      this.logger.error('Erro ao carregar config do banco, usando .env', error.message);
    }
  }

  async reload() {
    await this.loadCache();
  }

  get<T = string>(key: string, defaultValue?: T): T | undefined {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    const envValue = this.nestConfig.get<T>(key);
    if (envValue !== undefined) {
      return envValue;
    }
    return defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    const sql = `
      INSERT INTO nexus.config (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
    `;
    await this.postgresService.query(sql, [key, value]);
    this.cache.set(key, value);
  }

  async getAll(): Promise<Record<string, string>> {
    const { rows } = await this.postgresService.query(
      'SELECT key, value FROM nexus.config'
    );
    const result: Record<string, string> = {};
    rows.forEach(r => {
      result[r.key] = r.value;
    });
    return result;
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.postgresService.query(
      'DELETE FROM nexus.config WHERE key = $1',
      [key]
    );
    this.cache.delete(key);
    return (result.rowCount || 0) > 0;
  }
}
