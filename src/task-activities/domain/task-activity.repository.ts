import { TaskActivity } from '@/task-activities/domain/task-activity';

/**
 * Driven port for task-activity persistence. Implemented by adapters
 * (in-memory, Prisma, ...).
 */
export interface TaskActivityRepository {
  save(activity: TaskActivity): Promise<void>;
}

export const TASK_ACTIVITY_REPOSITORY = Symbol('TaskActivityRepository');
