// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class IngestionService {
  constructor(private postgresService: PostgresService) {}

  async findAll(query: any) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.file_id) {
      conditions.push(`j.file_id = $${params.length + 1}`);
      params.push(query.file_id);
    }
    if (query.status) {
      conditions.push(`j.status = $${params.length + 1}`);
      params.push(query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = query.limit ? parseInt(query.limit) : 50;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT j.id, j.file_id, j.status, j.n8n_execution_id, j.started_at, j.completed_at,
             j.error_message, j.logs, j.retry_count, j.created_at,
             f.original_name, f.filename
      FROM nexus.ingestion_jobs j
      LEFT JOIN nexus.files f ON j.file_id = f.id
      ${where}
      ORDER BY j.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const { rows } = await this.postgresService.query(sql, params);

    const data = rows.map(r => ({
      id: r.id,
      file_id: r.file_id,
      status: r.status,
      n8n_execution_id: r.n8n_execution_id,
      started_at: r.started_at,
      completed_at: r.completed_at,
      error_message: r.error_message,
      logs: r.logs,
      retry_count: r.retry_count,
      created_at: r.created_at,
      file: { id: r.file_id, original_name: r.original_name, filename: r.filename },
    }));

    const countSql = `SELECT COUNT(*) as total FROM nexus.ingestion_jobs j ${where}`;
    const { rows: countRows } = await this.postgresService.query(countSql, params.slice(0, -2));
    const total = parseInt(countRows[0].total, 10);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const sql = `
      SELECT j.*, f.original_name, f.filename
      FROM nexus.ingestion_jobs j
      LEFT JOIN nexus.files f ON j.file_id = f.id
      WHERE j.id = $1
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Job não encontrado');
    }
    const r = rows[0];
    return {
      id: r.id,
      file_id: r.file_id,
      status: r.status,
      n8n_execution_id: r.n8n_execution_id,
      started_at: r.started_at,
      completed_at: r.completed_at,
      error_message: r.error_message,
      logs: r.logs,
      retry_count: r.retry_count,
      created_at: r.created_at,
      file: { id: r.file_id, original_name: r.original_name, filename: r.filename },
    };
  }

  async updateJobStatus(jobId: string, status: string, errorMessage?: string, logs?: any) {
    const sets: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];

    if (status === 'processing') {
      sets.push(`started_at = $${params.length + 1}`);
      params.push(new Date().toISOString());
    } else if (status === 'completed' || status === 'failed') {
      sets.push(`completed_at = $${params.length + 1}`);
      params.push(new Date().toISOString());
    }

    if (errorMessage) {
      sets.push(`error_message = $${params.length + 1}`);
      params.push(errorMessage);
    }
    if (logs) {
      sets.push(`logs = $${params.length + 1}`);
      params.push(logs);
    }

    params.push(jobId);
    const sql = `UPDATE nexus.ingestion_jobs SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const { rows } = await this.postgresService.query(sql, params);
    if (rows.length === 0) {
      throw new NotFoundException('Job não encontrado');
    }
    return rows[0];
  }

  async createJob(fileId: string, n8nExecutionId?: string) {
    const sql = `
      INSERT INTO nexus.ingestion_jobs (file_id, status, n8n_execution_id, created_at)
      VALUES ($1, 'pending', $2, NOW())
      RETURNING *
    `;
    const { rows } = await this.postgresService.query(sql, [fileId, n8nExecutionId]);
    return rows[0];
  }
}
