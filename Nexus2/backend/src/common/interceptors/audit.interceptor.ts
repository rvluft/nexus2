// @ts-nocheck
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PostgresService } from '../../database/postgres.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private postgresService: PostgresService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    return next.handle().pipe(
      tap(async () => {
        try {
          if (this.shouldSkipLogging(request.method, request.url)) {
            return;
          }

          const action = this.buildActionString(request.method, request.url);
          const resourceType = this.extractResourceType(request.url);
          const ip = request.ip || request.connection?.remoteAddress;
          const userAgent = request.headers['user-agent'];

          this.logger.debug('Audit log', {
            user_id: user?.sub,
            action,
            resource_type: resourceType,
            ip: ip,
            status: response.statusCode,
          });

          if (user?.sub) {
            await this.postgresService.query(
              `INSERT INTO nexus.audit_logs (
                user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [
                user.sub,
                action,
                resourceType,
                this.extractResourceId(request.url, request.method),
                JSON.stringify({
                  method: request.method,
                  url: request.url,
                  status_code: response.statusCode,
                }),
                ip,
                userAgent,
              ]
            );
          }
        } catch (error) {
          this.logger.error('Audit log failed', error.message);
        }
      }),
    );
  }

  private shouldSkipLogging(method: string, url: string): boolean {
    if (method === 'GET' && (url.includes('/health') || url.includes('/docs'))) return true;
    if (url.includes('/auth/login') || url.includes('/auth/logout')) return true;
    if (url.includes('/auth/me')) return true; // skip token validation
    // Restringir logs apenas a arquivos e ingestão
    const resourceType = this.extractResourceType(url);
    if (!['files', 'ingestion'].includes(resourceType)) {
      return true;
    }
    return false;
  }

  private buildActionString(method: string, url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const resource = parts[parts.length - 1] || 'unknown';
    const actions: Record<string, string> = { GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
    return `${resource}.${actions[method] || 'unknown'}`;
  }

  private extractResourceType(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    if (parts.includes('files')) return 'files';
    if (parts.includes('ingestion')) return 'ingestion';
    if (parts.includes('knowledge')) return 'knowledge';
    if (parts.includes('users')) return 'users';
    if (parts.includes('audit')) return 'audit';
    return 'unknown';
  }

  private extractResourceId(url: string, method: string): string | undefined {
    if (method === 'POST') return undefined;
    const last = url.split('?')[0].split('/').filter(Boolean).pop();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(last || '') ? last : undefined;
  }
}
