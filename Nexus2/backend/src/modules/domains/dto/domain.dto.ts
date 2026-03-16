// @ts-nocheck
import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser hex válido (#RRGGBB)' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  expert_name?: string;

  @IsOptional()
  @IsString()
  expert_whatsapp?: string;

  @IsOptional()
  @IsString()
  expert_fallback_message?: string;
}

export class UpdateDomainDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser hex válido (#RRGGBB)' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  expert_name?: string;

  @IsOptional()
  @IsString()
  expert_whatsapp?: string;

  @IsOptional()
  @IsString()
  expert_fallback_message?: string;
}

export class AssignFilesDto {
  file_ids: string[];
}
