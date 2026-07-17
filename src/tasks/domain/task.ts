import { TaskStatus, DEFAULT_TASK_STATUS } from '@/tasks/domain/task-status';

export type TaskId = string;

/**
 * Task aggregate. For authorization purposes a task has an owner (the user it
 * "belongs to"); it also tracks the user it is currently assigned to, which
 * reassignment changes. A task may be unassigned (no assignee).
 *
 * It also carries some descriptive data: an optional due date (ISO calendar
 * date 'YYYY-MM-DD' or null), an optional link to a company (companyId or null)
 * and a workflow status (see TaskStatus). A brand-new task starts in the default
 * status; status transitions go through `changeStatus`.
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
    private _title: string,
    private _description: string,
    private _dueDate: string | null,
    public readonly companyId: string | null,
    private _status: TaskStatus,
  ) {}

  /** A brand-new task that has not been persisted yet (no identity). */
  static create(props: {
    ownerId: string;
    title: string;
    description: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    companyId?: string | null;
  }): Task {
    return new Task(
      null,
      props.ownerId,
      props.assigneeId ?? null,
      props.title,
      props.description,
      props.dueDate ?? null,
      props.companyId ?? null,
      DEFAULT_TASK_STATUS,
    );
  }

  /** Reconstitutes an already-persisted task from a repository. */
  static rehydrate(props: {
    id: TaskId;
    ownerId: string;
    assigneeId?: string | null;
    title?: string;
    description?: string;
    dueDate?: string | null;
    companyId?: string | null;
    status?: TaskStatus;
  }): Task {
    return new Task(
      props.id,
      props.ownerId,
      props.assigneeId ?? props.ownerId,
      props.title ?? '',
      props.description ?? '',
      props.dueDate ?? null,
      props.companyId ?? null,
      props.status ?? DEFAULT_TASK_STATUS,
    );
  }

  get id(): TaskId | null {
    return this._id;
  }

  get assigneeId(): string | null {
    return this._assigneeId;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get dueDate(): string | null {
    return this._dueDate;
  }

  get status(): TaskStatus {
    return this._status;
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

  /**
   * Applies a partial content edit. Only the fields present in `changes` are
   * touched (an omitted key leaves that attribute as-is), mirroring how the
   * Contact aggregate edits itself. Passing `dueDate: null` clears the due date;
   * omitting `dueDate` keeps the current one.
   */
  edit(changes: {
    title?: string;
    description?: string;
    dueDate?: string | null;
  }): void {
    if (changes.title !== undefined) {
      this._title = changes.title;
    }
    if (changes.description !== undefined) {
      this._description = changes.description;
    }
    if (changes.dueDate !== undefined) {
      this._dueDate = changes.dueDate;
    }
  }

  changeStatus(status: TaskStatus): void {
    this._status = status;
  }
}
