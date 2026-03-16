// @ts-nocheck
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BlocklistService } from './blocklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { CreateBlocklistEntryDto, UpdateBlocklistEntryDto } from './dto/blocklist.dto';

@ApiTags('blocklist')
@Controller('blocklist')
export class BlocklistController {
  constructor(private blocklistService: BlocklistService) {}

  // ── Rotas protegidas por JWT (admin/manager) ──────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista números ignorados' })
  findAll(@Query() query: any) {
    return this.blocklistService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe de uma entrada da blocklist' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blocklistService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adiciona número à blocklist' })
  create(@Body() dto: CreateBlocklistEntryDto, @Req() req: Request) {
    const userId = (req.user as any).sub;
    return this.blocklistService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza label/reason de um número' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBlocklistEntryDto) {
    return this.blocklistService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove número da blocklist' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.blocklistService.remove(id);
  }

  // ── Rota pública para n8n (sem JWT, apenas token estático) ─

  @Get('check/:number')
  @ApiOperation({ summary: 'Verifica se número está bloqueado (usado pelo n8n)' })
  async checkNumber(@Param('number') number: string, @Req() req: Request) {
    // Verificação por token estático no header Authorization
    const token = (req.headers as any)['authorization']?.replace('Bearer ', '');
    const expected = process.env.BLOCKLIST_WEBHOOK_TOKEN;
    if (expected && token !== expected) {
      return { number, blocked: false, error: 'unauthorized' };
    }
    return this.blocklistService.checkNumber(number);
  }
}
