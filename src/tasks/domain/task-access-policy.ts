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

  /**
   * Whether the actor may read the global activity feed (every task's activity in
   * one place). Reserved for privileged actors (ADMIN, CREATOR): a plain user has
   * no business seeing other people's task activity in bulk.
   */
  canViewAllActivity(actor: Actor): boolean {
    return this.isPrivileged(actor);
  }

  canReassign(actor: Actor, task: Task): boolean {
    return this.owns(actor, task);
  }

  /**
   * Whether a task should appear in the actor's task list: the owner and the
   * current assignee see it; privileged actors see every task.
   */
  isVisibleInList(actor: Actor, task: Task): boolean {
    return (
      this.isPrivileged(actor) ||
      this.owns(actor, task) ||
      this.isAssignee(actor, task)
    );
  }

  /**
   * The owner, the current assignee, or a privileged actor may move a task
   * through its status flow.
   */
  canChangeStatus(actor: Actor, task: Task): boolean {
    return (
      this.isPrivileged(actor) ||
      this.owns(actor, task) ||
      this.isAssignee(actor, task)
    );
  }

  /** The owner or a privileged actor may archive (logically delete) a task. */
  canArchive(actor: Actor, task: Task): boolean {
    return this.isPrivileged(actor) || this.owns(actor, task);
  }

  /**
   * The owner, the current assignee, or a privileged actor may edit a task's
   * content (title, description, due date). The assignee is included so they can
   * reschedule work assigned to them — e.g. dragging it on a calendar — matching
   * who may move it through its status flow.
   */
  canEdit(actor: Actor, task: Task): boolean {
    return (
      this.isPrivileged(actor) ||
      this.owns(actor, task) ||
      this.isAssignee(actor, task)
    );
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

  private isAssignee(actor: Actor, task: Task): boolean {
    return task.assigneeId === actor.id;
  }
}
