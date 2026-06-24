import { Actor } from '@/shared/domain/actor';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';
import { TaskRepository } from '@/tasks/domain/task.repository';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';

export interface LogTaskActivityCommand {
  actor: Actor;
  taskId: string;
  actionType: string;
  status: string;
  activityDate: string;
  description?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
}

/**
 * Application service for logging a follow-up activity on a task. The task must
 * exist and the actor must be allowed to view it (reusing TaskAccessPolicy, so
 * the same owner/privileged rule that gates viewing also gates logging). The
 * actor becomes the activity's author (its user_id and created_by).
 */
export class LogTaskActivity {
  private readonly policy = new TaskAccessPolicy();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly activities: TaskActivityRepository,
  ) {}

  async execute(command: LogTaskActivityCommand): Promise<TaskActivity> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    if (!this.policy.canView(command.actor, task)) {
      throw new AccessDeniedError();
    }

    const activity = TaskActivity.create({
      taskId: command.taskId,
      authorId: command.actor.id,
      actionType: command.actionType,
      status: command.status,
      activityDate: command.activityDate,
      description: command.description,
      nextAction: command.nextAction,
      nextActionDate: command.nextActionDate,
    });
    await this.activities.save(activity);
    return activity;
  }
}
