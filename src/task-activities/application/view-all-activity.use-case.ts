import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';

export interface ViewAllActivityQuery {
  actor: Actor;
}

/**
 * Application service for the global activity feed: every task's logged activity
 * in one place, most-recent first. Reserved for privileged actors (ADMIN,
 * CREATOR) — the decision is delegated to TaskAccessPolicy.canViewAllActivity —
 * since it deliberately crosses task ownership, unlike the per-task log which is
 * owner-gated.
 */
export class ViewAllActivity {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly activities: TaskActivityRepository) {}

  async execute(query: ViewAllActivityQuery): Promise<TaskActivity[]> {
    if (!this.policy.canViewAllActivity(query.actor)) {
      throw new AccessDeniedError();
    }
    return this.activities.findAll();
  }
}
