import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { CurrentActor } from '../auth/current-actor.decorator';
import type { Actor } from './domain/actor';
import { AccessDeniedError } from './domain/access-denied.error';
import { TaskNotFoundError } from './domain/task-not-found.error';
import { ViewTask } from './application/view-task.use-case';

@Controller('tasks')
export class TasksController {
  constructor(private readonly viewTask: ViewTask) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    try {
      const task = await this.viewTask.execute({ actor, taskId: id });
      return {
        id: task.id,
        ownerId: task.ownerId,
        assigneeId: task.assigneeId,
      };
    } catch (error) {
      // Translate domain failures into the HTTP boundary; everything else
      // bubbles up as a 500.
      if (error instanceof TaskNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof AccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}
