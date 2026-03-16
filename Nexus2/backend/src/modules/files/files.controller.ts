// @ts-nocheck
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
  UploadedFile,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de arquivo para ingestão' })
  @ApiResponse({ status: 201, description: 'Arquivo registrado com sucesso' })
  async upload(
    @Req() request: Request,
    @UploadedFile('file') file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Nenhum arquivo enviado');
    }

    const userId = (request.user as any).sub;
    return this.filesService.upload(
      userId,
      file.originalname,
      file.mimetype,
      file.buffer,
      file.size,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Lista arquivos (com filtros)' })
  async findAll(@Query() query: any, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.filesService.findAll(query, userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Busca arquivo específico' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.filesService.findOne(id, userId);
  }

  @Post(':id/reprocess')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Re-envia arquivo para ingestão (n8n)' })
  async reprocess(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.filesService.reprocess(id, userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualiza status do arquivo (kanban drag)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.filesService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove arquivo (soft delete)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.filesService.delete(id, userId);
  }
}
