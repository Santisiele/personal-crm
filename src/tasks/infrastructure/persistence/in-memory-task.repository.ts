import { Task, TaskId } from '@/tasks/domain/task';
import { TaskStatus } from '@/tasks/domain/task-status';
import { TaskListFilter, TaskRepository } from '@/tasks/domain/task.repository';

/**
 * In-memory driven adapter for tasks. Used in acceptance/unit tests and local
 * development.
 *
 * Owns identity for new tasks via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<TaskId, Task>();
  private readonly archived = new Set<TaskId>();
  private sequence = 0;

  save(task: Task): Promise<void> {
    if (task.id === null) {
      this.sequence += 1;
      task.assignId(String(this.sequence));
    }
    this.tasks.set(task.id as TaskId, task);
    return Promise.resolve();
  }

  findById(id: TaskId): Promise<Task | null> {
    if (this.archived.has(id)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.tasks.get(id) ?? null);
  }

  updateStatus(id: TaskId, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(id);
    if (task && !this.archived.has(id)) {
      task.changeStatus(status);
    }
    return Promise.resolve();
  }

  findAll(filter?: TaskListFilter): Promise<Task[]> {
    const matches = [...this.tasks.values()].filter((task) => {
      if (this.archived.has(task.id as TaskId)) {
        return false;
      }
      if (filter?.assigneeId && task.assigneeId !== filter.assigneeId) {
        return false;
      }
      if (filter?.companyId && task.companyId !== filter.companyId) {
        return false;
      }
      return true;
    });
    return Promise.resolve(matches);
  }

  // The reason and actor are persistence detail the in-memory double does not
  // model; archiving just makes the task disappear from reads (logical delete).
  archive(id: TaskId): Promise<void> {
    this.archived.add(id);
    return Promise.resolve();
  }
}
