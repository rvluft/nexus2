// @ts-nocheck
import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  requester_number: string;

  @IsOptional() @IsString()
  requester_name?: string;

  @IsOptional() @IsString()
  domain_id?: string;

  @IsOptional() @IsString()
  specialist_name?: string;

  @IsOptional() @IsString()
  specialist_whatsapp?: string;

  @IsOptional() @IsString()
  subject?: string;

  @IsOptional() @IsString()
  message_preview?: string;

  @IsOptional() @IsIn(['low','normal','high','urgent'])
  priority?: string;

  @IsOptional() @IsString()
  source?: string;
}

export class UpdateTicketDto {
  @IsOptional() @IsIn(['open','awaiting_specialist','in_progress','resolved','closed'])
  status?: string;

  @IsOptional() @IsIn(['low','normal','high','urgent'])
  priority?: string;

  @IsOptional() @IsString()
  specialist_name?: string;

  @IsOptional() @IsString()
  specialist_whatsapp?: string;

  @IsOptional() @IsString()
  subject?: string;

  @IsOptional() @IsString()
  resolved_at?: string;

  @IsOptional() @IsString()
  first_response_at?: string;
}

export class AddEventDto {
  @IsString()
  @IsIn(['opened','assigned','message_sent','message_received','status_changed','first_response','resolved','closed','note'])
  event_type: string;

  @IsOptional() @IsString()
  actor?: string;

  @IsOptional() @IsIn(['specialist','customer','system'])
  actor_type?: string;

  @IsOptional() @IsString()
  note?: string;
}

export class SlaStatsQueryDto {
  @IsOptional() @IsString()
  period?: 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';

  @IsOptional() @IsString()
  date_from?: string;

  @IsOptional() @IsString()
  date_to?: string;

  @IsOptional() @IsString()
  domain_id?: string;

  @IsOptional() @IsString()
  specialist_whatsapp?: string;

  @IsOptional() @IsString()
  group_by?: 'day' | 'week' | 'month';
}
