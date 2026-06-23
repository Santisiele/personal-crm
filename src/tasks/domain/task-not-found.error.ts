import { TaskId } from './task';

export class TaskNotFoundError extends Error {
  constructor(taskId: TaskId) {
    super(`Task ${taskId} not found`);
    this.name = 'TaskNotFoundError';
  }
}
