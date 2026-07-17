import { Actor } from '@/shared/domain/actor';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentRepository } from '@/task-assignments/domain/task-assignment.repository';

export interface ListMyPendingAssignmentsQuery {
  actor: Actor;
}

/**
 * Application service returning the actor's own pending assignments — the inbox
 * of assignments awaiting their accept/reject response.
 *
 * No authorization policy is needed beyond authentication: the query is scoped to
 * the actor's own id, so a user only ever sees assignments addressed to them.
 * This is the one way an assignee (who is not the task owner) can discover the
 * assignments they may respond to, since a task's full history is owner-gated.
 */
export class ListMyPendingAssignments {
  constructor(private readonly assignments: TaskAssignmentRepository) {}

  execute(query: ListMyPendingAssignmentsQuery): Promise<TaskAssignment[]> {
    return this.assignments.findPendingByAssignee(query.actor.id);
  }
}
