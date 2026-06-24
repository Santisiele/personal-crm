import { Task, TaskId } from '@/tasks/domain/task';

/**
 * Driven port for task persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface TaskRepository {
  save(task: Task): Promise<void>;
  /** Returns the task, or null if it does not exist or has been archived. */
  findById(id: TaskId): Promise<Task | null>;
  /** Logically deletes the task, recording who archived it and why. */
  archive(id: TaskId, reason: string, archivedBy: string): Promise<void>;
}

export const TASK_REPOSITORY = Symbol('TaskRepository');
