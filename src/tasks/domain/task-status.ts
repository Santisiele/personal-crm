/**
 * Workflow status of a task. The values match the `task_status.description`
 * lookup rows; the Prisma adapter resolves the status id by description.
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

/**
 * The status a brand-new task starts in. Mirrors the "lowest-id status as a
 * sane default" convention the adapters fall back to when a description is not
 * found in the lookup table.
 */
export const DEFAULT_TASK_STATUS = TaskStatus.PENDING;

const ALL_STATUSES: readonly TaskStatus[] = Object.values(TaskStatus);

/** Type guard / parser for an incoming status string. */
export function isTaskStatus(value: string): value is TaskStatus {
  return (ALL_STATUSES as readonly string[]).includes(value);
}
