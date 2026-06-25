import { Actor } from '@/shared/domain/actor';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';
import { TaskRepository } from '@/tasks/domain/task.repository';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';

export interface ViewActivityLogQuery {
  actor: Actor;
  taskId: string;
}

/**
 * Application service for reading a task's full activity log. The task must
 * exist and the actor must be allowed to view it (reusing TaskAccessPolicy, so
 * the same owner/privileged rule that gates logging an activity gates reading
 * the log). The repository returns the log most-recent first.
 */
export class ViewActivityLog {
  private readonly policy = new TaskAccessPolicy();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly activities: TaskActivityRepository,
  ) {}

  async execute(query: ViewActivityLogQuery): Promise<TaskActivity[]> {
    const task = await this.tasks.findById(query.taskId);
    if (!task) {
      throw new TaskNotFoundError(query.taskId);
    }
    if (!this.policy.canView(query.actor, task)) {
      throw new AccessDeniedError();
    }
    return this.activities.findByTaskId(query.taskId);
  }
}
