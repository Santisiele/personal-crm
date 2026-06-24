import { IsEnum } from 'class-validator';
import { TaskStatus } from '@/tasks/domain/task-status';

export class ChangeTaskStatusDto {
  /** The status to transition the task to (PENDING | IN_PROGRESS | DONE). */
  @IsEnum(TaskStatus)
  readonly status: TaskStatus;
}
