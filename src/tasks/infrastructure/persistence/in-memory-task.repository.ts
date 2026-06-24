import { Task, TaskId } from '@/tasks/domain/task';
import { TaskRepository } from '@/tasks/domain/task.repository';

/**
 * In-memory driven adapter for tasks. Used in acceptance/unit tests and local
 * development.
 *
 * Owns identity for new tasks via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<TaskId, Task>();
  private sequence = 0;

  async save(task: Task): Promise<void> {
    if (task.id === null) {
      this.sequence += 1;
      task.assignId(String(this.sequence));
    }
    this.tasks.set(task.id as TaskId, task);
  }

  async findById(id: TaskId): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }
}
