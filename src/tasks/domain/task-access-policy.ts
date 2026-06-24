import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';

/**
 * Domain service holding the authorization rules for tasks. Pure logic, free of
 * persistence or transport concerns, so it is trivially unit-testable.
 */
export class TaskAccessPolicy {
  private static readonly PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.CREATOR];

  canView(actor: Actor, task: Task): boolean {
    return this.isPrivileged(actor) || this.owns(actor, task);
  }

  canReassign(actor: Actor, task: Task): boolean {
    return this.owns(actor, task);
  }

  /** The owner or a privileged actor may archive (logically delete) a task. */
  canArchive(actor: Actor, task: Task): boolean {
    return this.isPrivileged(actor) || this.owns(actor, task);
  }

  /**
   * Anyone may create a task assigned to themselves; only privileged actors may
   * assign it to someone else or leave it unassigned (assigneeId === null).
   */
  canAssignTo(actor: Actor, assigneeId: string | null): boolean {
    return this.isPrivileged(actor) || assigneeId === actor.id;
  }

  private isPrivileged(actor: Actor): boolean {
    return TaskAccessPolicy.PRIVILEGED_ROLES.includes(actor.role);
  }

  private owns(actor: Actor, task: Task): boolean {
    return task.ownerId === actor.id;
  }
}
