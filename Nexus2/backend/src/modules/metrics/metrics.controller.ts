// @ts-nocheck
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/metric.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // ── Endpoints autenticados (JWT) ────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista histórico de avaliações RAG' })
  async findAll(@Query('limit') limit?: string, @Query('page') page?: string) {
    return this.metricsService.findAll(
      limit ? parseInt(limit) : 20,
      page ? parseInt(page) : 1,
    );
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Última avaliação RAG' })
  async findLatest() {
    return this.metricsService.findLatest();
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista alertas de métricas em aberto' })
  async findAlerts(@Query('all') all?: string) {
    return this.metricsService.findAlerts(all !== 'true');
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Insere avaliação manual (apenas admin)' })
  async create(@Body() dto: CreateMetricDto, @Req() req: any) {
    return this.metricsService.create(dto, req.user?.sub, 'manual');
  }

  @Patch('alerts/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve alerta (apenas admin)' })
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.metricsService.resolveAlert(id, req.user?.sub);
  }

  // ── Webhook do n8n (autenticação por token estático) ────────

  @Post('webhook')
  @ApiHeader({ name: 'Authorization', description: 'Bearer METRICS_WEBHOOK_TOKEN' })
  @ApiOperation({ summary: 'Recebe avaliação do n8n via webhook' })
  async webhook(
    @Body() dto: CreateMetricDto,
    @Headers('authorization') auth: string,
  ) {
    return this.metricsService.createFromWebhook(dto, auth);
  }
}
