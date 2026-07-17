import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskRepository } from '@/tasks/domain/task.repository';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';

export interface ReassignTaskCommand {
  actor: Actor;
  taskId: TaskId;
  newAssigneeId: string;
}

/**
 * Application service for reassigning a task to another user. The authorization
 * decision is delegated to the TaskAccessPolicy domain service, which needs the
 * current assignee's role as well as the actor: an actor may reassign a task
 * whose current assignee is strictly more junior than them (or a task they own).
 * The assignee's role is resolved here via the UserRepository, since the Task
 * aggregate holds only ids.
 */
export class ReassignTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(command: ReassignTaskCommand): Promise<void> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    const assigneeRole = await this.currentAssigneeRole(task.assigneeId);
    if (!this.policy.canReassign(command.actor, task, assigneeRole)) {
      throw new AccessDeniedError();
    }
    task.reassignTo(command.newAssigneeId);
    await this.tasks.save(task);
  }

  private async currentAssigneeRole(
    assigneeId: string | null,
  ): Promise<UserRole | null> {
    if (assigneeId === null) {
      return null;
    }
    const assignee = await this.users.findById(assigneeId);
    return assignee?.role ?? null;
  }
}
