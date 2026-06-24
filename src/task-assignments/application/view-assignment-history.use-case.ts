import { Actor } from '@/shared/domain/actor';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskRepository } from '@/tasks/domain/task.repository';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentRepository } from '@/task-assignments/domain/task-assignment.repository';

export interface ViewAssignmentHistoryQuery {
  actor: Actor;
  taskId: string;
}

/**
 * Application service for reading a task's full assignment history. The task must
 * exist and the actor must be allowed to view it (reusing TaskAccessPolicy, so
 * the same owner/privileged rule that gates viewing a task gates its history).
 * The repository returns the history most-recent first.
 */
export class ViewAssignmentHistory {
  private readonly policy = new TaskAccessPolicy();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly assignments: TaskAssignmentRepository,
  ) {}

  async execute(query: ViewAssignmentHistoryQuery): Promise<TaskAssignment[]> {
    const task = await this.tasks.findById(query.taskId);
    if (!task) {
      throw new TaskNotFoundError(query.taskId);
    }
    if (!this.policy.canView(query.actor, task)) {
      throw new AccessDeniedError();
    }
    return this.assignments.findByTaskId(query.taskId);
  }
}
