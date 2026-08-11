import { Actor } from '@/shared/domain/actor';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { Task, TaskId } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { TaskRepository } from '@/tasks/domain/task.repository';

export interface EditTaskCommand {
  actor: Actor;
  taskId: TaskId;
  /** New title; omit to leave it unchanged. */
  title?: string;
  /** New description; omit to leave it unchanged. */
  description?: string;
  /**
   * New due date: an ISO calendar date ('YYYY-MM-DD') to set it, `null` to clear
   * it, or omitted to leave it unchanged.
   */
  dueDate?: string | null;
  /** New company link: an id to set it, `null` to clear it, omit to leave it. */
  companyId?: string | null;
  /** New contact link: an id to set it, `null` to clear it, omit to leave it. */
  contactId?: string | null;
}

/**
 * Application service for editing a task's content (title, description, due
 * date). The authorization decision is delegated to the TaskAccessPolicy domain
 * service; the edit itself is a partial update applied by the aggregate. This is
 * what lets a calendar reschedule a task by changing its due date.
 */
export class EditTask {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(command: EditTaskCommand): Promise<Task> {
    const task = await this.tasks.findById(command.taskId);
    if (!task) {
      throw new TaskNotFoundError(command.taskId);
    }
    if (!this.policy.canEdit(command.actor, task)) {
      throw new AccessDeniedError();
    }
    task.edit({
      title: command.title,
      description: command.description,
      dueDate: command.dueDate,
      companyId: command.companyId,
      contactId: command.contactId,
    });
    await this.tasks.update(task);
    return task;
  }
}
