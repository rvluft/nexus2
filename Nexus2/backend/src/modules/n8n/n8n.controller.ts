// @ts-nocheck
import {
  Body, Controller, Get, Post, Req, UseGuards, Query, Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { N8nService } from '../../integrations/n8n/n8n.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { PostgresService } from '../../database/postgres.service';

@ApiTags('n8n')
@Controller('n8n')
export class N8nController {
  constructor(
    private readonly n8nService: N8nService,
    private readonly ingestionService: IngestionService,
    private readonly postgres: PostgresService,
  ) {}

  // ── Rota legada ──────────────────────────────────────────────

  @Post('trigger-admin-flow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispara fluxo n8n de administração' })
  async triggerAdminFlow(@Req() request: Request, @Body() body: any) {
    const userId = (request as any).user?.sub;
    const result = await this.n8nService.triggerAdminFlow(userId, body || {});
    return { message: 'Fluxo n8n disparado com sucesso', ...result };
  }

  // ── Trigger de ingestão ──────────────────────────────────────

  @Post('trigger-ingestion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dispara ingestão RAG via n8n',
    description: 'Aceita file_ids[] ou dispara todos os arquivos uploaded/error se omitido (máx 50)',
  })
  async triggerIngestion(@Body() body: { file_ids?: string[] }) {
    const apiBase = process.env.API_PUBLIC_URL || 'http://localhost:4100';
    const callbackUrl = `${apiBase}/api/n8n/ingestion-callback`;

    let fileSql: string;
    let sqlParams: any[];
    if (body.file_ids?.length) {
      fileSql = `
        SELECT id, original_name, mime_type, size_bytes, filename
        FROM nexus.files
        WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
      `;
      sqlParams = [body.file_ids];
    } else {
      fileSql = `
        SELECT id, original_name, mime_type, size_bytes, filename
        FROM nexus.files
        WHERE status IN ('uploaded','error') AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 50
      `;
      sqlParams = [];
    }

    const { rows: files } = await this.postgres.query(fileSql, sqlParams);
    if (files.length === 0) {
      return { triggered: 0, jobs: [], message: 'Nenhum arquivo elegível encontrado' };
    }

    const jobs: any[] = [];
    for (const file of files) {
      const job = await this.ingestionService.createJob(file.id);
      const downloadUrl = `${apiBase}/storage/${file.filename}`;
      const ingestionFile = {
        id: file.id,
        original_name: file.original_name,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        download_url: downloadUrl,
      };

      const { success, executionId } = await this.n8nService.triggerIngestion(
        ingestionFile, job.id, callbackUrl,
      );

      if (success && executionId) {
        await this.postgres.query(
          `UPDATE nexus.ingestion_jobs SET n8n_execution_id = $1, status = 'processing', started_at = NOW() WHERE id = $2`,
          [executionId, job.id],
        );
      }

      await this.postgres.query(
        `UPDATE nexus.files SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [file.id],
      );

      jobs.push({ job_id: job.id, file_id: file.id, file_name: file.original_name, n8n_called: success });
    }

    return { triggered: jobs.length, jobs };
  }

  // ── Callback do n8n (sem JWT, token estático) ────────────────

  @Post('ingestion-callback')
  @ApiOperation({ summary: 'Recebe status de ingestão do n8n' })
  async ingestionCallback(
    @Body() body: {
      jobId: string;
      fileId: string;
      status: 'completed' | 'failed';
      error?: string;
      logs?: any;
    },
    @Headers('authorization') auth: string,
  ) {
    const expected = process.env.N8N_INGESTION_CALLBACK_TOKEN;
    if (expected) {
      const token = auth?.replace('Bearer ', '');
      if (token !== expected) return { error: 'unauthorized' };
    }

    const { jobId, fileId, status, error, logs } = body;
    if (jobId) await this.ingestionService.updateJobStatus(jobId, status, error, logs);
    if (fileId) {
      const fileStatus = status === 'completed' ? 'processed' : 'error';
      await this.postgres.query(
        `UPDATE nexus.files SET status = $1, updated_at = NOW() WHERE id = $2`,
        [fileStatus, fileId],
      );
    }
    return { ok: true };
  }

  // ── Jobs de ingestão ─────────────────────────────────────────

  @Get('ingestion-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista jobs de ingestão' })
  getIngestionJobs(@Query() query: any) {
    return this.ingestionService.findAll({ ...query, limit: query.limit || 50 });
  }

  @Get('ingestion-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resumo de status dos jobs de ingestão' })
  async getIngestionStats() {
    const { rows } = await this.postgres.query(`
      SELECT status, COUNT(*) as count FROM nexus.ingestion_jobs GROUP BY status
    `);
    const stats: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const r of rows) stats[r.status] = parseInt(r.count, 10);
    const { rows: eligible } = await this.postgres.query(
      `SELECT COUNT(*) as count FROM nexus.files WHERE status IN ('uploaded','error') AND deleted_at IS NULL`,
    );
    stats['eligible'] = parseInt(eligible[0].count, 10);
    return stats;
  }
}
