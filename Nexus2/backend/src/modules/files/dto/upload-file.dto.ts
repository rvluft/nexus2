// @ts-nocheck
export class UploadFileDto {
  // DTO vazio - usamos multipart/form-data diretamente
}

export class FileQueryDto {
  status?: string;
  uploaded_by?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
