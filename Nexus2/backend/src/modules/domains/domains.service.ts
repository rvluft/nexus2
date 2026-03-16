// @ts-nocheck
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PostgresService } from '../../database/postgres.service';
import { CreateDomainDto, UpdateDomainDto } from './dto/domain.dto';

@Injectable()
export class DomainsService {
  constructor(private postgresService: PostgresService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? '' : 'WHERE d.deleted_at IS NULL AND d.is_active = true';
    const sql = `
      SELECT d.id, d.name, d.description, d.color, d.icon, d.is_active,
             d.expert_name, d.expert_whatsapp, d.expert_fallback_message,
             d.created_at, d.updated_at,
             u.name as created_by_name,
             COUNT(fd.file_id) as file_count
      FROM nexus.domains d
      LEFT JOIN nexus.users u ON d.created_by = u.id
      LEFT JOIN nexus.file_domains fd ON d.id = fd.domain_id
      ${where}
      GROUP BY d.id, u.name
      ORDER BY d.name ASC
    `;
    const { rows } = await this.postgresService.query(sql);
    return rows.map(r => ({ ...r, file_count: parseInt(r.file_count, 10) }));
  }

  async findOne(id: string) {
    const sql = `
      SELECT d.id, d.name, d.description, d.color, d.icon, d.is_active,
             d.expert_name, d.expert_whatsapp, d.expert_fallback_message,
             d.created_at, d.updated_at, u.name as created_by_name
      FROM nexus.domains d
      LEFT JOIN nexus.users u ON d.created_by = u.id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) throw new NotFoundException('Domínio não encontrado');
    return rows[0];
  }

  async create(dto: CreateDomainDto, userId: string) {
    const { rows: existing } = await this.postgresService.query(
      'SELECT id FROM nexus.domains WHERE name = $1 AND deleted_at IS NULL',
      [dto.name],
    );
    if (existing.length > 0) throw new ConflictException('Já existe um domínio com esse nome');

    const sql = `
      INSERT INTO nexus.domains (name, description, color, icon, expert_name, expert_whatsapp, expert_fallback_message, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, description, color, icon, is_active, expert_name, expert_whatsapp, expert_fallback_message, created_at
    `;
    const { rows } = await this.postgresService.query(sql, [
      dto.name,
      dto.description || null,
      dto.color || '#00d4d4',
      dto.icon || null,
      dto.expert_name || null,
      dto.expert_whatsapp || null,
      dto.expert_fallback_message || null,
      userId,
    ]);
    return { ...rows[0], file_count: 0 };
  }

  async update(id: string, dto: UpdateDomainDto) {
    await this.findOne(id);

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (dto.name !== undefined) { updates.push(`name = $${params.length + 1}`); params.push(dto.name); }
    if (dto.description !== undefined) { updates.push(`description = $${params.length + 1}`); params.push(dto.description); }
    if (dto.color !== undefined) { updates.push(`color = $${params.length + 1}`); params.push(dto.color); }
    if (dto.icon !== undefined) { updates.push(`icon = $${params.length + 1}`); params.push(dto.icon); }
    if (dto.is_active !== undefined) { updates.push(`is_active = $${params.length + 1}`); params.push(dto.is_active); }
    if (dto.expert_name !== undefined) { updates.push(`expert_name = $${params.length + 1}`); params.push(dto.expert_name || null); }
    if (dto.expert_whatsapp !== undefined) { updates.push(`expert_whatsapp = $${params.length + 1}`); params.push(dto.expert_whatsapp || null); }
    if (dto.expert_fallback_message !== undefined) { updates.push(`expert_fallback_message = $${params.length + 1}`); params.push(dto.expert_fallback_message || null); }

    params.push(id);
    const sql = `
      UPDATE nexus.domains SET ${updates.join(', ')}
      WHERE id = $${params.length} AND deleted_at IS NULL
      RETURNING id, name, description, color, icon, is_active, expert_name, expert_whatsapp, expert_fallback_message, updated_at
    `;
    const { rows } = await this.postgresService.query(sql, params);
    if (rows.length === 0) throw new NotFoundException('Domínio não encontrado');
    return rows[0];
  }

  async softDelete(id: string) {
    const sql = `
      UPDATE nexus.domains SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL RETURNING id
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) throw new NotFoundException('Domínio não encontrado');
    return { message: 'Domínio removido com sucesso' };
  }

  // ── Atribuição de arquivos ────────────────────────────────

  async getFilesForDomain(domainId: string) {
    await this.findOne(domainId);
    const sql = `
      SELECT f.id, f.original_name, f.status, f.size_bytes, f.created_at,
             fd.assigned_at
      FROM nexus.file_domains fd
      JOIN nexus.files f ON fd.file_id = f.id
      WHERE fd.domain_id = $1 AND f.deleted_at IS NULL
      ORDER BY fd.assigned_at DESC
    `;
    const { rows } = await this.postgresService.query(sql, [domainId]);
    return rows;
  }

  async assignFiles(domainId: string, fileIds: string[], userId: string) {
    await this.findOne(domainId);
    let added = 0;
    for (const fileId of fileIds) {
      await this.postgresService.query(
        `INSERT INTO nexus.file_domains (file_id, domain_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [fileId, domainId, userId],
      );
      added++;
    }
    return { message: `${added} arquivo(s) atribuído(s) ao domínio` };
  }

  async removeFileFromDomain(domainId: string, fileId: string) {
    const { rows } = await this.postgresService.query(
      `DELETE FROM nexus.file_domains WHERE domain_id = $1 AND file_id = $2 RETURNING file_id`,
      [domainId, fileId],
    );
    if (rows.length === 0) throw new NotFoundException('Associação não encontrada');
    return { message: 'Arquivo removido do domínio' };
  }

  // ── Mapa de domínios por arquivo (usado no frontend de arquivos) ──
  async getAssignments() {
    const sql = `
      SELECT fd.file_id, fd.domain_id, d.name as domain_name, d.color as domain_color
      FROM nexus.file_domains fd
      JOIN nexus.domains d ON fd.domain_id = d.id
      WHERE d.deleted_at IS NULL
      ORDER BY d.name
    `;
    const { rows } = await this.postgresService.query(sql);
    // Agrupar por file_id
    const map: Record<string, { domain_id: string; domain_name: string; domain_color: string }[]> = {};
    for (const row of rows) {
      if (!map[row.file_id]) map[row.file_id] = [];
      map[row.file_id].push({
        domain_id: row.domain_id,
        domain_name: row.domain_name,
        domain_color: row.domain_color,
      });
    }
    return map;
  }
}
