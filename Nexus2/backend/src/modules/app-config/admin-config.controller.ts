import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { AppConfigService } from './config.service';

@ApiTags('admin')
@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class AdminConfigController {
  constructor(private configService: AppConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas as configurações (key-value)' })
  async list() {
    const all = await this.configService.getAll();
    return all;
  }

  @Put()
  @ApiOperation({ summary: 'Atualiza ou cria uma configuração' })
  async update(@Body() body: { key: string; value: string }) {
    await this.configService.set(body.key, body.value);
    return { success: true, key: body.key };
  }

  @Put('batch')
  @ApiOperation({ summary: 'Atualiza múltiplas configurações de uma vez' })
  async updateBatch(@Body() body: Record<string, string>) {
    const keys = Object.keys(body);
    for (const key of keys) {
      await this.configService.set(key, body[key]);
    }
    return { success: true, updated: keys.length };
  }

  @Get('reload')
  @ApiOperation({ summary: 'Recarrega cache do banco (útil após alterações manual)' })
  async reload() {
    await this.configService.reload();
    return { success: true };
  }
}
