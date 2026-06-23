import { NotFoundError } from '../../shared/domain/domain-error';
import { TaskId } from './task';

export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: TaskId) {
    super(`Task ${taskId} not found`);
  }
}
