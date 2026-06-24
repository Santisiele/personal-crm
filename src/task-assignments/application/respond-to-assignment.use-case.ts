import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentRepository } from '@/task-assignments/domain/task-assignment.repository';
import { TaskAssignmentNotFoundError } from '@/task-assignments/domain/task-assignment-not-found.error';

/** The decision the assignee makes about their assignment. */
export enum AssignmentResponse {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export interface RespondToAssignmentCommand {
  actor: Actor;
  assignmentId: string;
  response: AssignmentResponse;
}

/**
 * Application service letting an assignee accept or reject THEIR assignment.
 *
 * Only the assignee may act on their assignment — this is an invariant of the
 * assignment aggregate (`isAssignedTo`), not of the task's access policy, so the
 * check lives here rather than reusing TaskAccessPolicy. A missing assignment is
 * a 404; anyone other than the assignee gets a 403.
 */
export class RespondToAssignment {
  constructor(private readonly assignments: TaskAssignmentRepository) {}

  async execute(command: RespondToAssignmentCommand): Promise<TaskAssignment> {
    const assignment = await this.assignments.findById(command.assignmentId);
    if (!assignment) {
      throw new TaskAssignmentNotFoundError(command.assignmentId);
    }
    if (!assignment.isAssignedTo(command.actor.id)) {
      throw new AccessDeniedError();
    }

    if (command.response === AssignmentResponse.ACCEPT) {
      assignment.accept();
    } else {
      assignment.reject();
    }
    await this.assignments.save(assignment);
    return assignment;
  }
}
