// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface TriggerN8nPayload {
  contextId?: string;
  notes?: string;
  [key: string]: any;
}

export interface IngestionFile {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly triggerUrl: string;
  private readonly ingestionWebhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.triggerUrl =
      this.configService.get<string>('N8N_TRIGGER_URL') ||
      this.configService.get<string>('N8N_WEBHOOK_URL');
    this.ingestionWebhookUrl =
      this.configService.get<string>('N8N_INGESTION_WEBHOOK_URL') || '';
  }

  async triggerAdminFlow(
    userId: string,
    payload: TriggerN8nPayload = {},
  ): Promise<{ success: boolean; executionId?: string }> {
    if (!this.triggerUrl) {
      this.logger.error('N8N_TRIGGER_URL/N8N_WEBHOOK_URL não configurado');
      throw new Error('Configuração do n8n ausente no servidor');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.triggerUrl,
          {
            userId,
            ...payload,
          },
          {
            timeout: 15000,
          },
        ),
      );

      const executionId =
        (response.data && (response.data.executionId || response.data.id)) ||
        undefined;

      return {
        success: true,
        executionId,
      };
    } catch (error: any) {
      this.logger.error(
        `Erro ao disparar fluxo n8n: ${error?.message || 'desconhecido'}`,
      );
      throw new Error('Falha ao contatar o n8n para disparar o fluxo');
    }
  }

  /**
   * Dispara ingestão RAG de um arquivo via webhook n8n.
   * callbackUrl é o endpoint desta API que o n8n chamará ao concluir.
   */
  async triggerIngestion(
    file: IngestionFile,
    jobId: string,
    callbackUrl: string,
  ): Promise<{ success: boolean; executionId?: string }> {
    if (!this.ingestionWebhookUrl) {
      this.logger.warn('N8N_INGESTION_WEBHOOK_URL não configurado — ingestão ignorada');
      return { success: false };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.ingestionWebhookUrl,
          { file, jobId, callbackUrl },
          { timeout: 20000 },
        ),
      );
      const executionId =
        response.data?.executionId || response.data?.id || undefined;
      return { success: true, executionId };
    } catch (error: any) {
      this.logger.error(`Erro ao disparar ingestão n8n para file ${file.id}: ${error?.message}`);
      return { success: false };
    }
  }
}

