import { NotFoundError } from '@/shared/domain/domain-error';
import { TaskAssignmentId } from '@/task-assignments/domain/task-assignment';

export class TaskAssignmentNotFoundError extends NotFoundError {
  constructor(id: TaskAssignmentId) {
    super(`Task assignment ${id} not found`);
  }
}
