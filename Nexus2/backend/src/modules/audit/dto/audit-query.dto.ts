// @ts-nocheck
export class AuditQueryDto {
  user_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
  page?: number;
  limit?: number;
}
