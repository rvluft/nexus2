import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { AppConfigService } from '../app-config/config.service';

@ApiTags('admin')
@Controller('admin/n8n-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class N8nConfigController {
  constructor(private appConfig: AppConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna as URLs de integração do n8n configuradas' })
  @ApiResponse({ status: 200, description: 'Configurações do n8n' })
  getConfig() {
    return {
      uploadUrl: this.appConfig.get<string>('N8N_FILES_WORKFLOW_UPLOAD_URL') || '',
      statusCallbackUrl: this.appConfig.get<string>('N8N_WEBHOOK_STATUS_URL') || '',
      baseUrl: this.appConfig.get<string>('N8N_BASE_URL') || '',
    };
  }
}
