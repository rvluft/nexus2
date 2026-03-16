// @ts-nocheck
import {
  Controller, Get, Post, Patch, Body, Param,
  Query, Req, UseGuards, Headers, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { CreateTicketDto, UpdateTicketDto, AddEventDto, SlaStatsQueryDto } from './dto/ticket.dto';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private svc: TicketsService) {}

  // ── CRUD ─────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista tickets de suporte' })
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Get('specialists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista especialistas distintos dos tickets' })
  getSpecialists() { return this.svc.getSpecialistList(); }

  @Get('sla-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna configurações de SLA' })
  getSlaConfig() { return this.svc.getSlaConfig(); }

  // ── Relatórios ───────────────────────────────────────────────

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Visão geral SLA (totais, breaches, médias)' })
  overview(@Query() q: SlaStatsQueryDto) { return this.svc.getOverviewStats(q); }

  @Get('stats/by-specialist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stats por especialista' })
  bySpecialist(@Query() q: SlaStatsQueryDto) { return this.svc.getBySpecialist(q); }

  @Get('stats/by-domain')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stats por domínio' })
  byDomain(@Query() q: SlaStatsQueryDto) { return this.svc.getByDomain(q); }

  @Get('stats/cross')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cruzamento especialista × domínio' })
  cross(@Query() q: SlaStatsQueryDto) { return this.svc.getCross(q); }

  @Get('stats/time-series')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Série temporal de tickets e SLA' })
  timeSeries(@Query() q: SlaStatsQueryDto) { return this.svc.getTimeSeries(q); }

  // ── Detail ───────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiBearerAuth()
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria ticket manualmente' })
  create(@Body() dto: CreateTicketDto, @Req() req: Request) {
    return this.svc.create(dto, (req.user as any).sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza ticket (status, prioridade, especialista)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adiciona evento ao ticket' })
  addEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddEventDto) {
    return this.svc.addEvent(id, dto);
  }

  @Patch('sla-config/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza configuração de SLA' })
  updateSlaConfig(@Body() body: {
    domain_id?: string; priority: string;
    first_response_minutes: number; resolution_minutes: number;
  }) {
    return this.svc.upsertSlaConfig(
      body.domain_id || null, body.priority,
      body.first_response_minutes, body.resolution_minutes,
    );
  }

  // ── Webhook n8n (sem JWT) ────────────────────────────────────

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook n8n — cria ou atualiza ticket' })
  async webhook(
    @Body() body: any,
    @Headers('authorization') auth: string,
  ) {
    const expected = process.env.TICKETS_WEBHOOK_TOKEN;
    if (expected) {
      const token = auth?.replace('Bearer ', '');
      if (token !== expected) return { error: 'unauthorized' };
    }
    return this.svc.webhookCreateOrUpdate(body);
  }
}
