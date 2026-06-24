import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface ArchiveTaskCommand {
  actor: Actor;
  taskId: TaskId;
  reason: string;
}

/**
 * Application service for archiving a task (logical delete). The task is marked
 * deleted and the reason is recorded as a task activity; once archived the task
 * is no longer found by normal reads. The authorization decision is delegated to
 * the TaskAccessPolicy domain service.
 */
export class ArchiveTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(command: ArchiveTaskCommand): Promise<void> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    if (!this.policy.canArchive(command.actor, task)) {
      throw new AccessDeniedError();
    }
    await this.tasks.archive(command.taskId, command.reason, command.actor.id);
  }
}
