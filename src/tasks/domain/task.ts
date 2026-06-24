export type TaskId = string;

/**
 * Task aggregate. For authorization purposes a task has an owner (the user it
 * "belongs to"); it also tracks the user it is currently assigned to, which
 * reassignment changes. A task may be unassigned (no assignee).
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created task has a null id until
 * saved — mirroring the User aggregate.
 */
export class Task {
  private constructor(
    private _id: TaskId | null,
    public readonly ownerId: string,
    private _assigneeId: string | null,
    public readonly title: string,
    public readonly description: string,
  ) {}

  /** A brand-new task that has not been persisted yet (no identity). */
  static create(props: {
    ownerId: string;
    title: string;
    description: string;
    assigneeId?: string | null;
  }): Task {
    return new Task(
      null,
      props.ownerId,
      props.assigneeId ?? null,
      props.title,
      props.description,
    );
  }

  /** Reconstitutes an already-persisted task from a repository. */
  static rehydrate(props: {
    id: TaskId;
    ownerId: string;
    assigneeId?: string | null;
    title?: string;
    description?: string;
  }): Task {
    return new Task(
      props.id,
      props.ownerId,
      props.assigneeId ?? props.ownerId,
      props.title ?? '',
      props.description ?? '',
    );
  }

  get id(): TaskId | null {
    return this._id;
  }

  get assigneeId(): string | null {
    return this._assigneeId;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: TaskId): void {
    if (this._id !== null) {
      throw new Error('Task already has an identity');
    }
    this._id = id;
  }

  reassignTo(userId: string): void {
    this._assigneeId = userId;
  }
}
