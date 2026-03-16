// @ts-nocheck
import { IsNumber, IsOptional, IsString, Min, Max, IsInt } from 'class-validator';

export class CreateMetricDto {
  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  context_precision?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  context_recall?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  faithfulness?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  answer_relevancy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(1)
  context_relevancy?: number;

  @IsOptional()
  @IsInt()
  sample_size?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class ResolveAlertDto {
  // sem campos obrigatórios — apenas o id via param
}
