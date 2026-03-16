// @ts-nocheck
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import { CreateBlocklistEntryDto, UpdateBlocklistEntryDto } from './dto/blocklist.dto';

@Injectable()
export class BlocklistService {
  constructor(private postgresService: PostgresService) {}

  async findAll(query: any = {}) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push(`(number ILIKE $${params.length + 1} OR label ILIKE $${params.length + 1})`);
      params.push(`%${query.search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit ? parseInt(query.limit) : 100;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT w.id, w.number, w.label, w.reason, w.created_at, w.updated_at,
             u.name as added_by_name
      FROM nexus.whatsapp_ignored_numbers w
      LEFT JOIN nexus.users u ON w.added_by = u.id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    const { rows } = await this.postgresService.query(sql, params);

    const countSql = `SELECT COUNT(*) as total FROM nexus.whatsapp_ignored_numbers ${where}`;
    const { rows: countRows } = await this.postgresService.query(countSql, params.slice(0, -2));
    const total = parseInt(countRows[0].total, 10);

    return { data: rows, total, page, limit };
  }

  async findOne(id: string) {
    const { rows } = await this.postgresService.query(
      `SELECT w.*, u.name as added_by_name
       FROM nexus.whatsapp_ignored_numbers w
       LEFT JOIN nexus.users u ON w.added_by = u.id
       WHERE w.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Entrada não encontrada');
    return rows[0];
  }

  async isBlocked(number: string): Promise<boolean> {
    const { rows } = await this.postgresService.query(
      `SELECT 1 FROM nexus.whatsapp_ignored_numbers WHERE number = $1`,
      [number],
    );
    return rows.length > 0;
  }

  async create(dto: CreateBlocklistEntryDto, userId: string) {
    const { rows: existing } = await this.postgresService.query(
      `SELECT id FROM nexus.whatsapp_ignored_numbers WHERE number = $1`,
      [dto.number],
    );
    if (existing.length > 0) throw new ConflictException('Número já está na blocklist');

    const sql = `
      INSERT INTO nexus.whatsapp_ignored_numbers (number, label, reason, added_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, number, label, reason, created_at
    `;
    const { rows } = await this.postgresService.query(sql, [
      dto.number,
      dto.label || null,
      dto.reason || null,
      userId,
    ]);
    return rows[0];
  }

  async update(id: string, dto: UpdateBlocklistEntryDto) {
    await this.findOne(id);
    const updates = ['updated_at = NOW()'];
    const params: any[] = [];

    if (dto.label !== undefined) { updates.push(`label = $${params.length + 1}`); params.push(dto.label || null); }
    if (dto.reason !== undefined) { updates.push(`reason = $${params.length + 1}`); params.push(dto.reason || null); }

    params.push(id);
    const sql = `
      UPDATE nexus.whatsapp_ignored_numbers SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING id, number, label, reason, updated_at
    `;
    const { rows } = await this.postgresService.query(sql, params);
    if (rows.length === 0) throw new NotFoundException('Entrada não encontrada');
    return rows[0];
  }

  async remove(id: string) {
    const { rows } = await this.postgresService.query(
      `DELETE FROM nexus.whatsapp_ignored_numbers WHERE id = $1 RETURNING id`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('Entrada não encontrada');
    return { message: 'Número removido da blocklist' };
  }

  // Endpoint usado pelo n8n para checar em tempo real
  async checkNumber(number: string) {
    const blocked = await this.isBlocked(number);
    return { number, blocked };
  }
}
