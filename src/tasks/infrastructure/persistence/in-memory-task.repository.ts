import { Task, TaskId } from '../../domain/task';
import { TaskRepository } from '../../domain/task.repository';

/**
 * In-memory driven adapter for tasks. Used in acceptance/unit tests and local
 * development.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<TaskId, Task>();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async findById(id: TaskId): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }
}
