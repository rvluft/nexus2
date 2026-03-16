// @ts-nocheck
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { createWriteStream, promises as fs } from 'fs';
import * as crypto from 'crypto';
import { PostgresService } from '../../database/postgres.service';
import path from 'path';
import { N8nFilesService } from './n8n-files.service';
import { AppConfigService } from '../app-config/config.service';

@Injectable()
export class FilesService {
  private storageDir = '/app/storage/uploads';

  constructor(
    private postgresService: PostgresService,
    private n8nFilesService: N8nFilesService,
    private appConfig: AppConfigService,
  ) {
    // Ensure storage exists (Docker volume mounted)
  }

  private generateFilename(originalName: string): string {
    const ext = originalName.split('.').pop();
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}.${ext}`;
  }

  async upload(userId: string, originalName: string, mimeType: string, buffer: Buffer, size: number) {
    const filename = this.generateFilename(originalName);
    const storagePath = path.join(this.storageDir, filename);

    // Salvar arquivo localmente (Docker volume persistido)
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.writeFile(storagePath, buffer);

    // Registrar no banco
    const sql = `
      INSERT INTO nexus.files (
        filename, original_name, mime_type, size_bytes, storage_path,
        uploaded_by, status, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'uploaded', '{}', NOW(), NOW())
      RETURNING id, filename, original_name, mime_type, size_bytes, storage_path, status, uploaded_by, created_at
    `;
    const { rows } = await this.postgresService.query(sql, [
      filename,
      originalName,
      mimeType,
      size,
      storagePath,
      userId,
    ]);

    const file = rows[0];

    // Montar URL pública para download do arquivo
    const baseUrl = this.configService.get<string>('API_PUBLIC_URL') || 'http://localhost:4100';
    const downloadUrl = `${baseUrl}/storage/${file.filename}`;

    // Notificar n8n/Dropbox de forma assíncrona
    this.n8nFilesService
      .notifyUpload({
        id: file.id,
        original_name: file.original_name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        download_url: downloadUrl,
        callbackUrl: this.appConfig.get<string>('N8N_WEBHOOK_STATUS_URL'),
      })
      .catch(() => undefined);

    return file;
  }

  async findAll(query: any, userId?: string) {
    const conditions: string[] = ['f.deleted_at IS NULL'];
    const params: any[] = [];

    if (query.status) {
      conditions.push(`f.status = $${params.length + 1}`);
      params.push(query.status);
    }
    if (query.uploaded_by) {
      conditions.push(`f.uploaded_by = $${params.length + 1}`);
      params.push(query.uploaded_by);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = query.limit ? parseInt(query.limit) : 50;
    const page = query.page ? parseInt(query.page) : 1;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT f.id, f.filename, f.original_name, f.mime_type, f.size_bytes,
             f.status, f.uploaded_by, f.created_at, f.updated_at,
             u.name as uploader_name, u.email as uploader_email
      FROM nexus.files f
      LEFT JOIN nexus.users u ON f.uploaded_by = u.id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const { rows } = await this.postgresService.query(sql, params);
    const data = rows.map(r => ({
      id: r.id,
      filename: r.filename,
      original_name: r.original_name,
      mime_type: r.mime_type,
      size_bytes: r.size_bytes,
      status: r.status,
      uploaded_by: r.uploaded_by,
      created_at: r.created_at,
      uploader: { id: r.uploaded_by, name: r.uploader_name, email: r.uploader_email },
    }));

    // Total count
    const countSql = `SELECT COUNT(*) as total FROM nexus.files f ${where}`;
    const { rows: countRows } = await this.postgresService.query(countSql, params.slice(0, -2));
    const total = parseInt(countRows[0].total, 10);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId?: string) {
    const sql = `
      SELECT f.*, u.name as uploader_name, u.email as uploader_email
      FROM nexus.files f
      LEFT JOIN nexus.users u ON f.uploaded_by = u.id
      WHERE f.id = $1 AND f.deleted_at IS NULL
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    if (rows.length === 0) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    const file = rows[0];
    return {
      id: file.id,
      filename: file.filename,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      storage_path: file.storage_path,
      status: file.status,
      uploaded_by: file.uploaded_by,
      created_at: file.created_at,
      updated_at: file.updated_at,
      uploader: { id: file.uploaded_by, name: file.uploader_name, email: file.uploader_email },
      ingestion_jobs: [], // TODO: query ingestion_jobs
    };
  }

  async updateStatus(id: string, status: string) {
    const ALLOWED = ['uploaded', 'processing', 'processed', 'error'];
    if (!ALLOWED.includes(status)) {
      throw new Error(`Status inválido: ${status}`);
    }
    const sql = `
      UPDATE nexus.files SET status = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, status, updated_at
    `;
    const { rows } = await this.postgresService.query(sql, [status, id]);
    if (rows.length === 0) throw new NotFoundException('Arquivo não encontrado');
    return rows[0];
  }

  async reprocess(id: string, userId: string) {
    const file = await this.findOne(id, userId);

    // Verificar se já existe job pendente
    const { rows: pending } = await this.postgresService.query(
      `SELECT id FROM nexus.ingestion_jobs WHERE file_id = $1 AND status IN ('pending', 'processing')`,
      [id]
    );
    if (pending.length > 0) {
      throw new ForbiddenException('Arquivo já está em processamento');
    }

    // Criar job
    const sql = `
      INSERT INTO nexus.ingestion_jobs (file_id, status, created_at)
      VALUES ($1, 'pending', NOW())
      RETURNING id, file_id, status, created_at
    `;
    const { rows } = await this.postgresService.query(sql, [id]);
    const job = rows[0];

    // TODO: Chamar n8n webhook

    return { message: 'Reprocessamento iniciado', job };
  }

  async delete(id: string, userId: string) {
    // Verificar se existe
    await this.findOne(id, userId);

    const sql = `
      UPDATE nexus.files
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    const { rows } = await this.postgresService.query(sql, [userId, id]);
    if (rows.length === 0) {
      throw new NotFoundException('Erro ao remover arquivo');
    }
    // Melhor esforço: remover também em Dropbox via n8n
    this.n8nFilesService.deleteFile(id).catch(() => undefined);
    return { message: 'Arquivo removido com sucesso' };
  }

  async getDownloadUrl(id: string, userId?: string) {
    // Se houver integração de download via n8n/Dropbox, usar primeiro
    try {
      const fromN8n = await this.n8nFilesService.getDownloadLink(id);
      if (fromN8n?.url) {
        return fromN8n;
      }
    } catch {
      // fallback silencioso para storage local
    }

    const file = await this.findOne(id, userId);
    const baseUrl = this.appConfig.get<string>('API_PUBLIC_URL') || 'http://localhost:4100';
    return {
      url: `${baseUrl}/storage/${file.filename}`,
      filename: file.original_name,
    };
  }
}
