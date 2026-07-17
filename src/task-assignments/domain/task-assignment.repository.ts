import {
  TaskAssignment,
  TaskAssignmentId,
} from '@/task-assignments/domain/task-assignment';

/**
 * Driven port for task-assignment persistence. Implemented by adapters
 * (in-memory, Prisma, ...).
 */
export interface TaskAssignmentRepository {
  /** Persists a new assignment or updates an existing one (e.g. its status). */
  save(assignment: TaskAssignment): Promise<void>;
  /**
   * The full assignment history of a task, ordered most-recent first (by
   * `assignedAt` then id, descending).
   */
  findByTaskId(taskId: string): Promise<TaskAssignment[]>;
  /**
   * The pending assignments addressed to a given assignee, ordered most-recent
   * first — the inbox of assignments awaiting their accept/reject response.
   */
  findPendingByAssignee(assigneeId: string): Promise<TaskAssignment[]>;
  /** Returns the assignment, or null if it does not exist. */
  findById(id: TaskAssignmentId): Promise<TaskAssignment | null>;
}

export const TASK_ASSIGNMENT_REPOSITORY = Symbol('TaskAssignmentRepository');
