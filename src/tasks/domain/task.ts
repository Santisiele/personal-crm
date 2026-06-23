export type TaskId = string;

/**
 * Task aggregate. For authorization purposes a task has an owner (the user it
 * "belongs to"). Reassignment behaviour is added by its own scenario.
 */
export class Task {
  private constructor(
    public readonly id: TaskId,
    public readonly ownerId: string,
  ) {}

  static create(props: { id: TaskId; ownerId: string }): Task {
    return new Task(props.id, props.ownerId);
  }
}
