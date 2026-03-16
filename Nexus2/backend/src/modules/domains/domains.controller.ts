// @ts-nocheck
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Req, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DomainsService } from './domains.service';
import { CreateDomainDto, UpdateDomainDto, AssignFilesDto } from './dto/domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';

@ApiTags('domains')
@Controller('domains')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Lista domínios ativos' })
  async findAll(@Query('all') all?: string) {
    return this.domainsService.findAll(all === 'true');
  }

  @Get('assignments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Mapa de domínios por arquivo (file_id → domínios[])' })
  async getAssignments() {
    return this.domainsService.getAssignments();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Busca domínio por ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.findOne(id);
  }

  @Get(':id/files')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Lista arquivos do domínio' })
  async getFiles(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.getFilesForDomain(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cria domínio' })
  async create(@Body() dto: CreateDomainDto, @Req() req: any) {
    return this.domainsService.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualiza domínio' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDomainDto) {
    return this.domainsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove domínio (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.domainsService.softDelete(id);
  }

  @Post(':id/files')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atribui arquivo(s) ao domínio' })
  async assignFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignFilesDto,
    @Req() req: any,
  ) {
    return this.domainsService.assignFiles(id, dto.file_ids, req.user?.sub);
  }

  @Delete(':id/files/:fileId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove arquivo do domínio' })
  async removeFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.domainsService.removeFileFromDomain(id, fileId);
  }
}
