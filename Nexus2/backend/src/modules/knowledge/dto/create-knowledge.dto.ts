// @ts-nocheck
import { IsNotEmpty, IsOptional, IsUUID, IsString, IsNumber } from 'class-validator';

export class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsUUID()
  file_id?: string;

  @IsOptional()
  @IsString()
  embedding_id?: string;

  @IsOptional()
  @IsNumber()
  chunk_order?: number;

  @IsOptional()
  metadata?: any;
}

export class KnowledgeQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  file_id?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}
