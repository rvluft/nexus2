// @ts-nocheck
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateBlocklistEntryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,20}(@[\w.]+)?$/, {
    message: 'number deve ser numérico (10-20 dígitos), opcionalmente seguido de @grupo',
  })
  number: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateBlocklistEntryDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
