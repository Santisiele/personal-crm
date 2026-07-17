import { api } from '@/api/client';
import type { LogActivityInput, TaskActivity } from '@/api/types';

/** Reads a task's activity log, most-recent first (owner or privileged only). */
export async function listActivities(
  taskId: string,
): Promise<TaskActivity[]> {
  const { data } = await api.get<TaskActivity[]>(`/tasks/${taskId}/activities`);
  return data;
}

export async function logActivity(
  taskId: string,
  input: LogActivityInput,
): Promise<TaskActivity> {
  const { data } = await api.post<TaskActivity>(
    `/tasks/${taskId}/activities`,
    input,
  );
  return data;
}
