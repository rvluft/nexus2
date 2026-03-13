// @ts-nocheck
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class KnowledgeService {
  constructor(private postgresService: PostgresService) {}

  async findAll(query: any, userId?: string) {
    const conditions: string[] = ['k.deleted_at IS NULL'];
    const params: any[] = [];

    if (query.file_id) {
      conditions.push(`k.file_id = $${params.length + 1}`);
      params.push(query.file_id);
    }
    if (query.search) {
      conditions.push(`(k.content ILIKE $${params.length + 1} OR k.title ILIKE $${params.length + 1})`);
      params.push(`%${query.search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = query.limit ? parseInt(query.limit) : 50;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT k.id, k.title, k.content, k.file_id, k.chunk_order, k.embedding_id, k.metadata,
             k.created_by, k.updated_by, k.created_at, k.updated_at,
             u1.name as creator_name, u1.email as creator_email,
             u2.name as updater_name, u2.email as updater_email,
             f.original_name
      FROM nexus.knowledge_base k
      LEFT JOIN nexus.users u1 ON k.created_by = u1.id
      LEFT JOIN nexus.users u2 ON k.updated_by = u2.id
      LEFT JOIN nexus.files f ON k.file_id = f.id
      ${where}
      ORDER BY k.chunk_order ASC, k.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const { rows } = await this.postgresService.query(sql, params);

    const data = rows.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      file_id: r.file_id,
      chunk_order: r.chunk_order,
      embedding_id: r.embedding_id,
      metadata: r.metadata,
      created_by: r.created_by,
      updated_by: r.updated_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      file: r.file_id ? { original_name: r.original_name } : undefined,
      creator: r.created_by ? { id: r.created_by, name: r.creator_name, email: r.creator_email } : undefined,
      updater: r.updated_by ? { id: r.updated_by, name: r.updater_name, email: r.updater_email } : undefined,
    }));

    const countSql = `SELECT COUNT(*) as total FROM nexus.knowledge_base k ${where}`;
    const { rows: countRows } = await this.postgresService.query(countSql, params.slice(0, -2));
    const total = parseInt(countRows[0].total, 10);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId?: string) {
    const sql = `
      SELECT k.*, f.original_name, u1.name as creator_name, u1.email as creator_email,
             u2.name as updater_name, u2.email as updater_email
      FROM nexus.knowledge_base k
      LEFT JOIN nexus.files f ON k.file_id = f.id
      LEFT JOIN nexus.users u1 ON k.created_by = u1.id
      LEFT JOIN nexus.users u2 ON k.updated_by = u2.id
      WHERE k.id = $1 AND k.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Item não encontrado');
    }
    const r = rows[0];
    return {
      id: r.id,
      title: r.title,
      content: r.content,
      file_id: r.file_id,
      chunk_order: r.chunk_order,
      embedding_id: r.embedding_id,
      metadata: r.metadata,
      created_by: r.created_by,
      updated_by: r.updated_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      file: r.file_id ? { original_name: r.original_name } : undefined,
      creator: { id: r.created_by, name: r.creator_name, email: r.creator_email },
      updater: { id: r.updated_by, name: r.updater_name, email: r.updater_email },
    };
  }

  async create(userId: string, createDto: any) {
    const sql = `
      INSERT INTO nexus.knowledge_base (
        title, content, file_id, chunk_order, embedding_id, metadata,
        created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())
      RETURNING *
    `;
    const { rows } = await this.postgresService.query(sql, [
      createDto.title || null,
      createDto.content,
      createDto.file_id || null,
      createDto.chunk_order || 0,
      createDto.embedding_id || null,
      createDto.metadata || {},
      userId,
    ]);
    return this.findOne(rows[0].id);
  }

  async update(id: string, userId: string, updateDto: any) {
    const updates: string[] = ['updated_by = $1', 'updated_at = NOW()'];
    const params: any[] = [userId];

    if (updateDto.title !== undefined) {
      updates.push(`title = $${params.length + 1}`);
      params.push(updateDto.title);
    }
    if (updateDto.content !== undefined) {
      updates.push(`content = $${params.length + 1}`);
      params.push(updateDto.content);
    }
    if (updateDto.metadata !== undefined) {
      updates.push(`metadata = $${params.length + 1}`);
      params.push(updateDto.metadata);
    }

    params.push(id);
    const sql = `UPDATE nexus.knowledge_base SET ${updates.join(', ')} WHERE id = $${params.length} AND deleted_at IS NULL RETURNING *`;
    const { rows } = await this.postgresService.query(sql, params);
    if (rows.length === 0) {
      throw new NotFoundException('Item não encontrado');
    }
    return this.findOne(rows[0].id);
  }

  async delete(id: string, userId: string) {
    const sql = `
      UPDATE nexus.knowledge_base
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    const { rows } = await this.postgresService.query(sql, [userId, id]);
    if (rows.length === 0) {
      throw new NotFoundException('Erro ao remover item');
    }
    return { message: 'Item removido com sucesso' };
  }
}
