import { TaskActivity } from '@/task-activities/domain/task-activity';

/**
 * Driven port for task-activity persistence. Implemented by adapters
 * (in-memory, Prisma, ...).
 */
export interface TaskActivityRepository {
  save(activity: TaskActivity): Promise<void>;
  /** A task's activity log, most-recent first. */
  findByTaskId(taskId: string): Promise<TaskActivity[]>;
  /** Every logged activity across all tasks, most-recent first (the global feed). */
  findAll(): Promise<TaskActivity[]>;
}

export const TASK_ACTIVITY_REPOSITORY = Symbol('TaskActivityRepository');
