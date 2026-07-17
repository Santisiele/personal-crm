import { TaskActivity } from '@/task-activities/domain/task-activity';

/**
 * The HTTP shape of a logged activity, shared by the per-task log and the global
 * feed. It carries the author and the free-text detail (description / next
 * action) so a client can show "who did what" without a second request.
 */
export function presentActivity(activity: TaskActivity) {
  return {
    id: activity.id,
    taskId: activity.taskId,
    authorId: activity.authorId,
    actionType: activity.actionType,
    status: activity.status,
    activityDate: activity.activityDate,
    description: activity.description,
    nextAction: activity.nextAction,
    nextActionDate: activity.nextActionDate,
  };
}
