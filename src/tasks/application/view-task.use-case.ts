import { Actor } from '../domain/actor';
import { AccessDeniedError } from '../domain/access-denied.error';
import { Task, TaskId } from '../domain/task';
import { TaskAccessPolicy } from '../domain/task-access-policy';
import { TaskNotFoundError } from '../domain/task-not-found.error';
import { TaskRepository } from '../domain/task.repository';

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
