export type TaskActivityId = string;

/**
 * TaskActivity aggregate: a logged follow-up (a call/meeting/note) on a task,
 * with an optional next action. The author is the actor who logged it; it maps
 * to both the activity's `user_id` and its `created_by`.
 *
 * `actionType` and `status` are descriptions (e.g. 'CALL', 'DONE') resolved to
 * lookup ids by the persistence adapter, mirroring how the task aggregate keeps
 * statuses out of the domain.
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created activity has a null id
 * until saved — mirroring the other aggregates.
 */
export class TaskActivity {
  private constructor(
    private _id: TaskActivityId | null,
    public readonly taskId: string,
    public readonly authorId: string,
    public readonly actionType: string,
    public readonly status: string,
    public readonly activityDate: string,
    public readonly description: string | null,
    public readonly nextAction: string | null,
    public readonly nextActionDate: string | null,
  ) {}

  /** A brand-new activity that has not been persisted yet (no identity). */
  static create(props: {
    taskId: string;
    authorId: string;
    actionType: string;
    status: string;
    activityDate: string;
    description?: string | null;
    nextAction?: string | null;
    nextActionDate?: string | null;
  }): TaskActivity {
    return new TaskActivity(
      null,
      props.taskId,
      props.authorId,
      props.actionType,
      props.status,
      props.activityDate,
      props.description ?? null,
      props.nextAction ?? null,
      props.nextActionDate ?? null,
    );
  }

  /** Reconstitutes an already-persisted activity from a repository. */
  static rehydrate(props: {
    id: TaskActivityId;
    taskId: string;
    authorId: string;
    actionType: string;
    status: string;
    activityDate: string;
    description?: string | null;
    nextAction?: string | null;
    nextActionDate?: string | null;
  }): TaskActivity {
    return new TaskActivity(
      props.id,
      props.taskId,
      props.authorId,
      props.actionType,
      props.status,
      props.activityDate,
      props.description ?? null,
      props.nextAction ?? null,
      props.nextActionDate ?? null,
    );
  }

  get id(): TaskActivityId | null {
    return this._id;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: TaskActivityId): void {
    if (this._id !== null) {
      throw new Error('TaskActivity already has an identity');
    }
    this._id = id;
  }
}
