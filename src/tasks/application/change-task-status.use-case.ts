import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { Task, TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskStatus } from '@/tasks/domain/task-status';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface ChangeTaskStatusCommand {
  actor: Actor;
  taskId: TaskId;
  status: TaskStatus;
}

/**
 * Application service for transitioning a task through its status flow. The
 * authorization decision (owner, assignee, or privileged) is delegated to the
 * TaskAccessPolicy domain service.
 */
export class ChangeTaskStatus {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(command: ChangeTaskStatusCommand): Promise<Task> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    if (!this.policy.canChangeStatus(command.actor, task)) {
      throw new AccessDeniedError();
    }
    task.changeStatus(command.status);
    await this.tasks.updateStatus(command.taskId, command.status);
    return task;
  }
}
