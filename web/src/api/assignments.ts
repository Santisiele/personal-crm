import { api } from '@/api/client';
import type { TaskAssignment } from '@/api/types';

/** The authenticated user's pending assignments (their accept/reject inbox). */
export async function listMyPendingAssignments(): Promise<TaskAssignment[]> {
  const { data } = await api.get<TaskAssignment[]>('/me/assignments/pending');
  return data;
}

/** A task's full assignment history, most-recent first (owner or privileged). */
export async function listAssignmentHistory(
  taskId: string,
): Promise<TaskAssignment[]> {
  const { data } = await api.get<TaskAssignment[]>(
    `/tasks/${taskId}/assignments`,
  );
  return data;
}

export async function acceptAssignment(
  taskId: string,
  assignmentId: string,
): Promise<void> {
  await api.post(`/tasks/${taskId}/assignments/${assignmentId}/accept`);
}

export async function rejectAssignment(
  taskId: string,
  assignmentId: string,
): Promise<void> {
  await api.post(`/tasks/${taskId}/assignments/${assignmentId}/reject`);
}
