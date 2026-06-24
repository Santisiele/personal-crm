import { AssignmentStatus } from '@/task-assignments/domain/assignment-status';

export type TaskAssignmentId = string;

/**
 * TaskAssignment aggregate: one entry in a task's assignment history. It records
 * who a task was assigned to (`assigneeId`), who assigned it (`assignedById`),
 * when (`assignedAt`) and the assignment's lifecycle `status`.
 *
 * The `tasks` context keeps assignment history out of its own aggregate and only
 * updates the latest assignment in place when reassigning; this context owns the
 * history and the status lifecycle. The assignee may accept or reject their
 * assignment (a domain transition), which this aggregate enforces.
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created assignment has a null id
 * until saved — mirroring the other aggregates.
 */
export class TaskAssignment {
  private constructor(
    private _id: TaskAssignmentId | null,
    public readonly taskId: string,
    public readonly assigneeId: string,
    public readonly assignedById: string,
    private _status: AssignmentStatus,
    public readonly assignedAt: Date,
  ) {}

  /** A brand-new assignment that has not been persisted yet (no identity). */
  static create(props: {
    taskId: string;
    assigneeId: string;
    assignedById: string;
    status?: AssignmentStatus;
    assignedAt?: Date;
  }): TaskAssignment {
    return new TaskAssignment(
      null,
      props.taskId,
      props.assigneeId,
      props.assignedById,
      props.status ?? AssignmentStatus.PENDING,
      props.assignedAt ?? new Date(),
    );
  }

  /** Reconstitutes an already-persisted assignment from a repository. */
  static rehydrate(props: {
    id: TaskAssignmentId;
    taskId: string;
    assigneeId: string;
    assignedById: string;
    status: AssignmentStatus;
    assignedAt: Date;
  }): TaskAssignment {
    return new TaskAssignment(
      props.id,
      props.taskId,
      props.assigneeId,
      props.assignedById,
      props.status,
      props.assignedAt,
    );
  }

  get id(): TaskAssignmentId | null {
    return this._id;
  }

  get status(): AssignmentStatus {
    return this._status;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: TaskAssignmentId): void {
    if (this._id !== null) {
      throw new Error('TaskAssignment already has an identity');
    }
    this._id = id;
  }

  /** Whether the given actor is the assignee of this assignment. */
  isAssignedTo(userId: string): boolean {
    return this.assigneeId === userId;
  }

  accept(): void {
    this._status = AssignmentStatus.ACCEPTED;
  }

  reject(): void {
    this._status = AssignmentStatus.REJECTED;
  }
}
