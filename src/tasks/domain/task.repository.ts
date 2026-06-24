import { Task, TaskId } from '@/tasks/domain/task';
import { TaskStatus } from '@/tasks/domain/task-status';

/** Filters for listing tasks. */
export interface TaskListFilter {
  /** Restrict to tasks currently assigned to this user. */
  assigneeId?: string;
  /** Restrict to tasks linked to this company. */
  companyId?: string;
}

/**
 * Driven port for task persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface TaskRepository {
  save(task: Task): Promise<void>;
  /** Returns the task, or null if it does not exist or has been archived. */
  findById(id: TaskId): Promise<Task | null>;
  /** Persists a status transition for an existing task. */
  updateStatus(id: TaskId, status: TaskStatus): Promise<void>;
  /**
   * Lists non-archived tasks matching the (optional) filters, newest first.
   * Authorization (whose tasks the caller may see) is enforced by the use case.
   */
  findAll(filter?: TaskListFilter): Promise<Task[]>;
  /** Logically deletes the task, recording who archived it and why. */
  archive(id: TaskId, reason: string, archivedBy: string): Promise<void>;
}

export const TASK_REPOSITORY = Symbol('TaskRepository');
