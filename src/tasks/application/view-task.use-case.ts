import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { Task, TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface ViewTaskQuery {
  actor: Actor;
  taskId: TaskId;
}

/**
 * Application service for reading a single task. Delegates the authorization
 * decision to the TaskAccessPolicy domain service.
 */
export class ViewTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(query: ViewTaskQuery): Promise<Task> {
    const task = await this.tasks.findById(query.taskId);
    if (!task) {
      throw new TaskNotFoundError(query.taskId);
    }
    if (!this.policy.canView(query.actor, task)) {
      throw new AccessDeniedError();
    }
    return task;
  }
}
