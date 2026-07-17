import { api } from '@/api/client';
import type {
  CreateTaskInput,
  EditTaskInput,
  Task,
  TaskStatus,
} from '@/api/types';

export interface TaskFilters {
  assigneeId?: string;
  companyId?: string;
}

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/tasks', { params: filters });
  return data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get<Task>(`/tasks/${id}`);
  return data;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', input);
  return data;
}

export async function editTask(
  id: string,
  input: EditTaskInput,
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}`, input);
  return data;
}

export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/status`, { status });
  return data;
}

export async function reassignTask(
  id: string,
  newAssigneeId: string,
): Promise<void> {
  await api.patch(`/tasks/${id}/assignee`, { newAssigneeId });
}

export async function archiveTask(id: string, reason: string): Promise<void> {
  await api.post(`/tasks/${id}/archive`, { reason });
}
