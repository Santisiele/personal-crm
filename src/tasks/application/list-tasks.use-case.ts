import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskListFilter, TaskRepository } from '@/tasks/domain/task.repository';

export interface ListTasksQuery {
  actor: Actor;
  filter?: TaskListFilter;
}

/**
 * Application service for listing tasks. The caller sees the tasks they may view
 * (their own or ones assigned to them); privileged actors see all. The decision
 * is delegated to the TaskAccessPolicy domain service so the rule lives in one
 * place. Archived tasks are excluded by the repository.
 */
export class ListTasks {
  private readonly policy = new TaskAccessPolicy();

  constructor(private readonly tasks: TaskRepository) {}

  async execute(query: ListTasksQuery): Promise<Task[]> {
    const tasks = await this.tasks.findAll(query.filter);
    return tasks.filter((task) =>
      this.policy.isVisibleInList(query.actor, task),
    );
  }
}
