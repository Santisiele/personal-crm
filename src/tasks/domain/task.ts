export type TaskId = string;

/**
 * Task aggregate. For authorization purposes a task has an owner (the user it
 * "belongs to"); it also tracks the user it is currently assigned to, which
 * reassignment changes.
 */
export class Task {
  private constructor(
    public readonly id: TaskId,
    public readonly ownerId: string,
    private _assigneeId: string,
  ) {}

  static create(props: {
    id: TaskId;
    ownerId: string;
    assigneeId?: string;
  }): Task {
    return new Task(props.id, props.ownerId, props.assigneeId ?? props.ownerId);
  }

  get assigneeId(): string {
    return this._assigneeId;
  }

  reassignTo(userId: string): void {
    this._assigneeId = userId;
  }
}
