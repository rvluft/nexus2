// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AppConfigService } from '../app-config/config.service';
import { firstValueFrom } from 'rxjs';

export interface N8nFileMetadata {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  download_url?: string;
  callbackUrl?: string;
  dropbox_id?: string;
  path?: string;
}

@Injectable()
export class N8nFilesService {
  private readonly logger = new Logger(N8nFilesService.name);

  private readonly uploadUrl: string | undefined;
  private readonly listUrl: string | undefined;
  private readonly downloadUrl: string | undefined;
  private readonly deleteUrl: string | undefined;
  private readonly statusCallbackUrl: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {
    this.uploadUrl = this.appConfig.get<string>('N8N_FILES_WORKFLOW_UPLOAD_URL');
    this.listUrl = this.appConfig.get<string>('N8N_FILES_WORKFLOW_LIST_URL');
    this.downloadUrl = this.appConfig.get<string>('N8N_FILES_WORKFLOW_DOWNLOAD_URL');
    this.deleteUrl = this.appConfig.get<string>('N8N_FILES_WORKFLOW_DELETE_URL');
    this.statusCallbackUrl = this.appConfig.get<string>('N8N_WEBHOOK_STATUS_URL');
  }

  async notifyUpload(file: N8nFileMetadata) {
    if (!this.uploadUrl) {
      this.logger.warn('N8N_FILES_WORKFLOW_UPLOAD_URL não configurado, ignorando integração com Dropbox.');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          this.uploadUrl,
          {
            file,
            callbackUrl: this.statusCallbackUrl, // n8n usará para atualizar status
          },
          { timeout: 20000 },
        ),
      );
    } catch (error: any) {
      this.logger.error(
        `Erro ao notificar upload para n8n/Dropbox: ${error?.message || 'desconhecido'}`,
      );
    }
  }

  async listFiles(params: any = {}) {
    if (!this.listUrl) {
      this.logger.warn('N8N_FILES_WORKFLOW_LIST_URL não configurado, retornando lista vazia.');
      return [];
    }

    const { data } = await firstValueFrom(
      this.httpService.post(
        this.listUrl,
        params,
        { timeout: 15000 },
      ),
    );
    return data?.files || data || [];
  }

  async getDownloadLink(fileId: string) {
    if (!this.downloadUrl) {
      this.logger.warn('N8N_FILES_WORKFLOW_DOWNLOAD_URL não configurado.');
      throw new Error('Download via n8n não configurado');
    }

    const { data } = await firstValueFrom(
      this.httpService.post(
        this.downloadUrl,
        { fileId },
        { timeout: 15000 },
      ),
    );

    return {
      url: data?.url,
      filename: data?.filename,
    };
  }

  async deleteFile(fileId: string) {
    if (!this.deleteUrl) {
      this.logger.warn('N8N_FILES_WORKFLOW_DELETE_URL não configurado, ignorando remoção em Dropbox.');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          this.deleteUrl,
          { fileId },
          { timeout: 15000 },
        ),
      );
    } catch (error: any) {
      this.logger.error(
        `Erro ao remover arquivo em n8n/Dropbox: ${error?.message || 'desconhecido'}`,
      );
    }
  }
}

