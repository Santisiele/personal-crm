import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { Task } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface CreateTaskCommand {
  actor: Actor;
  title: string;
  description: string;
  /**
   * Who the task is assigned to:
   *  - `undefined` (omitted): assign to the creator (the common case);
   *  - `null`: leave the task unassigned (privileged actors only);
   *  - a user id: assign to that user (privileged actors only, unless it is the
   *    creator themselves).
   */
  assigneeId?: string | null;
  /** Optional ISO calendar date ('YYYY-MM-DD') the task is due. */
  dueDate?: string | null;
  /** Optional id of the company the task is associated with. */
  companyId?: string | null;
}

/**
 * Application service for creating a task. The creator always owns the task; the
 * authorization decision is about who it may be assigned to, delegated to the
 * TaskAccessPolicy domain service.
 */
export class CreateTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(command: CreateTaskCommand): Promise<Task> {
    const assigneeId =
      command.assigneeId === undefined ? command.actor.id : command.assigneeId;

    if (!this.policy.canAssignTo(command.actor, assigneeId)) {
      throw new AccessDeniedError();
    }

    const task = Task.create({
      ownerId: command.actor.id,
      title: command.title,
      description: command.description,
      assigneeId,
      dueDate: command.dueDate,
      companyId: command.companyId,
    });
    await this.tasks.save(task);
    return task;
  }
}
