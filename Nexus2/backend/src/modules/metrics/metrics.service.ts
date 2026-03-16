// @ts-nocheck
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostgresService } from '../../database/postgres.service';
import { CreateMetricDto } from './dto/metric.dto';

// Thresholds conforme RAG - Metricas.md
const THRESHOLDS: Record<string, number> = {
  context_precision: 0.85,
  context_recall: 0.75,
  faithfulness: 0.90,
  answer_relevancy: 0.85,
  context_relevancy: 0.90,
};

@Injectable()
export class MetricsService {
  constructor(
    private postgresService: PostgresService,
    private configService: ConfigService,
  ) {}

  async findAll(limit = 20, page = 1) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT m.id, m.evaluated_at, m.context_precision, m.context_recall,
             m.faithfulness, m.answer_relevancy, m.context_relevancy,
             m.avg_score, m.sample_size, m.notes, m.source, m.created_at,
             u.name as created_by_name
      FROM nexus.rag_metrics m
      LEFT JOIN nexus.users u ON m.created_by = u.id
      ORDER BY m.evaluated_at DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await this.postgresService.query(sql, [limit, offset]);

    const { rows: countRows } = await this.postgresService.query(
      'SELECT COUNT(*) as total FROM nexus.rag_metrics'
    );

    return {
      data: rows,
      total: parseInt(countRows[0].total, 10),
      page,
      limit,
    };
  }

  async findLatest() {
    const sql = `
      SELECT m.id, m.evaluated_at, m.context_precision, m.context_recall,
             m.faithfulness, m.answer_relevancy, m.context_relevancy,
             m.avg_score, m.sample_size, m.notes, m.source, m.created_at
      FROM nexus.rag_metrics m
      ORDER BY m.evaluated_at DESC
      LIMIT 1
    `;
    const { rows } = await this.postgresService.query(sql);
    return rows[0] || null;
  }

  async create(dto: CreateMetricDto, userId?: string, source = 'manual') {
    const sql = `
      INSERT INTO nexus.rag_metrics
        (context_precision, context_recall, faithfulness, answer_relevancy,
         context_relevancy, sample_size, notes, source, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, evaluated_at, context_precision, context_recall, faithfulness,
                answer_relevancy, context_relevancy, avg_score, sample_size, notes, source
    `;
    const { rows } = await this.postgresService.query(sql, [
      dto.context_precision ?? null,
      dto.context_recall ?? null,
      dto.faithfulness ?? null,
      dto.answer_relevancy ?? null,
      dto.context_relevancy ?? null,
      dto.sample_size ?? null,
      dto.notes ?? null,
      dto.source || source,
      userId || null,
    ]);

    const metric = rows[0];
    await this.checkAndCreateAlerts(metric);
    return metric;
  }

  async createFromWebhook(dto: CreateMetricDto, authHeader: string) {
    const expectedToken = this.configService.get<string>('METRICS_WEBHOOK_TOKEN');
    if (!expectedToken) {
      throw new UnauthorizedException('METRICS_WEBHOOK_TOKEN não configurado');
    }
    const token = authHeader?.replace('Bearer ', '').trim();
    if (token !== expectedToken) {
      throw new UnauthorizedException('Token inválido');
    }
    return this.create(dto, null, dto.source || 'n8n');
  }

  async findAlerts(onlyOpen = true) {
    const where = onlyOpen ? 'WHERE a.resolved_at IS NULL' : '';
    const sql = `
      SELECT a.id, a.metric_run_id, a.metric_name, a.threshold, a.current_value,
             a.message, a.resolved_at, a.created_at,
             u.name as resolved_by_name
      FROM nexus.metric_alerts a
      LEFT JOIN nexus.users u ON a.resolved_by = u.id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const { rows } = await this.postgresService.query(sql);
    return rows;
  }

  async resolveAlert(alertId: string, userId: string) {
    const sql = `
      UPDATE nexus.metric_alerts
      SET resolved_at = NOW(), resolved_by = $2
      WHERE id = $1 AND resolved_at IS NULL
      RETURNING *
    `;
    const { rows } = await this.postgresService.query(sql, [alertId, userId]);
    if (rows.length === 0) {
      throw new NotFoundException('Alerta não encontrado ou já resolvido');
    }
    return rows[0];
  }

  private async checkAndCreateAlerts(metric: any) {
    const alerts: any[] = [];

    for (const [field, threshold] of Object.entries(THRESHOLDS)) {
      const value = metric[field];
      if (value !== null && value !== undefined && value < threshold) {
        alerts.push({
          metric_run_id: metric.id,
          metric_name: field,
          threshold,
          current_value: value,
          message: `${field} = ${(value * 100).toFixed(1)}% está abaixo do threshold de ${(threshold * 100).toFixed(0)}%`,
        });
      }
    }

    for (const alert of alerts) {
      await this.postgresService.query(
        `INSERT INTO nexus.metric_alerts
           (metric_run_id, metric_name, threshold, current_value, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [alert.metric_run_id, alert.metric_name, alert.threshold, alert.current_value, alert.message],
      );
    }
  }
}
