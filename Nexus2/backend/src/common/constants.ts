// @ts-nocheck
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  REPROCESS = 'reprocess', // específico para reprocessamento
}

export enum ResourceType {
  FILES = 'files',
  KNOWLEDGE = 'knowledge',
  INGESTION = 'ingestion',
  USERS = 'users',
  AUDIT = 'audit',
}

export enum FileStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error',
}

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: [
    // Files
    `${ResourceType.FILES}.${PermissionAction.CREATE}`,
    `${ResourceType.FILES}.${PermissionAction.READ}`,
    `${ResourceType.FILES}.${PermissionAction.DELETE}`,
    `${ResourceType.FILES}.${PermissionAction.REPROCESS}`,
    // Knowledge
    `${ResourceType.KNOWLEDGE}.${PermissionAction.READ}`,
    `${ResourceType.KNOWLEDGE}.${PermissionAction.UPDATE}`,
    // Ingestion
    `${ResourceType.INGESTION}.${PermissionAction.READ}`,
    // Users
    `${ResourceType.USERS}.${PermissionAction.CREATE}`,
    `${ResourceType.USERS}.${PermissionAction.READ}`,
    `${ResourceType.USERS}.${PermissionAction.UPDATE}`,
    `${ResourceType.USERS}.${PermissionAction.DELETE}`,
    // Audit
    `${ResourceType.AUDIT}.${PermissionAction.READ}`,
  ],
  [UserRole.MANAGER]: [
    `${ResourceType.FILES}.${PermissionAction.CREATE}`,
    `${ResourceType.FILES}.${PermissionAction.READ}`,
    `${ResourceType.FILES}.${PermissionAction.DELETE}`,
    `${ResourceType.FILES}.${PermissionAction.REPROCESS}`,
    `${ResourceType.KNOWLEDGE}.${PermissionAction.READ}`,
    `${ResourceType.KNOWLEDGE}.${PermissionAction.UPDATE}`,
    `${ResourceType.INGESTION}.${PermissionAction.READ}`,
    `${ResourceType.AUDIT}.${PermissionAction.READ}`,
  ],
  [UserRole.VIEWER]: [
    `${ResourceType.FILES}.${PermissionAction.READ}`,
    `${ResourceType.KNOWLEDGE}.${PermissionAction.READ}`,
    `${ResourceType.INGESTION}.${PermissionAction.READ}`,
    `${ResourceType.AUDIT}.${PermissionAction.READ}`,
  ],
};
