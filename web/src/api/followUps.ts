import { api } from '@/api/client';
import type { TaskStatus } from '@/api/types';

export interface FollowUp {
  taskId: string;
  company: string | null;
  contact: string | null;
  lastAction: { date: string; description: string | null; by: string } | null;
  nextActionDate: string | null;
  nextAction: string;
  willDo: string | null;
  status: TaskStatus;
}

/** The follow-up board: one row per visible task, ordered by next action. */
export async function listFollowUps(): Promise<FollowUp[]> {
  const { data } = await api.get<FollowUp[]>('/follow-ups');
  return data;
}
