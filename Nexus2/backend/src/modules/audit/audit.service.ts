// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class AuditService {
  constructor(private postgresService: PostgresService) {}

  async findAll(query: any) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.user_id) {
      conditions.push(`l.user_id = $${params.length + 1}`);
      params.push(query.user_id);
    }
    if (query.action) {
      conditions.push(`l.action = $${params.length + 1}`);
      params.push(query.action);
    }
    if (query.resource_type) {
      conditions.push(`l.resource_type = $${params.length + 1}`);
      params.push(query.resource_type);
    }
    if (query.date_from) {
      conditions.push(`l.created_at >= $${params.length + 1}`);
      params.push(query.date_from);
    }
    if (query.date_to) {
      conditions.push(`l.created_at <= $${params.length + 1}`);
      params.push(query.date_to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = query.limit ? parseInt(query.limit) : 100;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT l.id, l.user_id, l.action, l.resource_type, l.resource_id, l.details,
             l.ip_address, l.user_agent, l.created_at,
             u.name as user_name, u.email as user_email
      FROM nexus.audit_logs l
      LEFT JOIN nexus.users u ON l.user_id = u.id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const { rows } = await this.postgresService.query(sql, params);

    const data = rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      action: r.action,
      resource_type: r.resource_type,
      resource_id: r.resource_id,
      details: r.details,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      created_at: r.created_at,
      user: r.user_id ? { id: r.user_id, name: r.user_name, email: r.user_email } : null,
    }));

    const countSql = `SELECT COUNT(*) as total FROM nexus.audit_logs l ${where}`;
    const { rows: countRows } = await this.postgresService.query(countSql, params.slice(0, -2));
    const total = parseInt(countRows[0].total, 10);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const sql = `
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM nexus.audit_logs l
      LEFT JOIN nexus.users u ON l.user_id = u.id
      WHERE l.id = $1
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Log não encontrado');
    }
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.user_id,
      action: r.action,
      resource_type: r.resource_type,
      resource_id: r.resource_id,
      details: r.details,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      created_at: r.created_at,
      user: r.user_id ? { id: r.user_id, name: r.user_name, email: r.user_email } : null,
    };
  }

  async findByUser(userId: string, limit = 50) {
    const sql = `
      SELECT *
      FROM nexus.audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const { rows } = await this.postgresService.query(sql, [userId, limit]);
    return rows;
  }
}
