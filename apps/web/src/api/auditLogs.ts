import { apiClient } from './client';

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  details: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  hasMore: boolean;
  page: number;
}

export async function getAuditLogs(page: number) {
  const response = await apiClient.get<AuditLogPage>(
    '/audit-logs',
    { params: { page } },
  );

  return response.data;
}

export async function getAuditLogsForEntity(
  entity: string,
  entityId: string,
) {
  const response = await apiClient.get<AuditLogEntry[]>(
    `/audit-logs/${entity}/${entityId}`,
  );

  return response.data;
}
