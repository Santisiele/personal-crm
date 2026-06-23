import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface ReassignTaskCommand {
  actor: Actor;
  taskId: TaskId;
  newAssigneeId: string;
}

/**
 * Application service for reassigning a task to another user. The authorization
 * decision is delegated to the TaskAccessPolicy domain service.
 */
export class ReassignTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(command: ReassignTaskCommand): Promise<void> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    if (!this.policy.canReassign(command.actor, task)) {
      throw new AccessDeniedError();
    }
    task.reassignTo(command.newAssigneeId);
    await this.tasks.save(task);
  }
}
