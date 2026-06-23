import { Task, TaskId } from './task';

/**
 * Driven port for task persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(id: TaskId): Promise<Task | null>;
}

export const TASK_REPOSITORY = Symbol('TaskRepository');
