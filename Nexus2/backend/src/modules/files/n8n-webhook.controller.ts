import { Controller, Post, Body, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { PostgresService } from '../../database/postgres.service';

@ApiTags('webhooks')
@Controller('webhooks/n8n')
export class N8nWebhookController {
  constructor(private postgresService: PostgresService) {}

  @Post('status')
  @ApiOperation({ summary: 'Callback do n8n para atualizar status de ingestão' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  async updateStatus(@Body() body: { fileId: string; status: string; dropboxPath?: string }) {
    const { fileId, status, dropboxPath } = body;

    // Validar status permitido
    const allowed = ['processed', 'error'];
    if (!allowed.includes(status)) {
      throw new Error('Status inválido');
    }

    // Atualizar arquivo
    const sql = `
      UPDATE nexus.files
      SET status = $1, dropbox_path = $2, updated_at = NOW()
      WHERE id = $3 AND status != 'processed'
      RETURNING id, status, dropbox_path
    `;
    await this.postgresService.query(sql, [status, dropboxPath, fileId]);

    // Opcional: atualizar ingestion_jobs também?
    // Podemos encontrar o job mais recente e atualizar
    await this.postgresService.query(
      `UPDATE nexus.ingestion_jobs SET status = $1, completed_at = NOW() WHERE file_id = $2 AND status IN ('pending', 'processing')`,
      [status, fileId]
    );

    return { success: true, fileId, status };
  }
}
