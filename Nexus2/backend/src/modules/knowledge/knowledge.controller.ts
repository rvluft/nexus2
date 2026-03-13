// @ts-nocheck
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  ParseUUIDPipe, 
  UseGuards, 
  Req, 
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto, KnowledgeQueryDto } from './dto/create-knowledge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/constants';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Lista itens da base de conhecimento' })
  async findAll(@Query() query: KnowledgeQueryDto, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.knowledgeService.findAll(query, userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Busca item específico' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.knowledgeService.findOne(id, userId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cria novo item manualmente' })
  async create(@Req() request: Request, @Body() createDto: CreateKnowledgeDto) {
    const userId = (request.user as any).sub;
    return this.knowledgeService.create(userId, createDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualiza item' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Req() request: Request, 
    @Body() updateDto: any
  ) {
    const userId = (request.user as any).sub;
    return this.knowledgeService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove item' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    const userId = (request.user as any).sub;
    return this.knowledgeService.delete(id, userId);
  }
}
