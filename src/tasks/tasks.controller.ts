import { Controller, Get, Param } from '@nestjs/common';
import { CurrentActor } from '../auth/current-actor.decorator';
import type { Actor } from '../shared/domain/actor';
import { ViewTask } from './application/view-task.use-case';

@Controller('tasks')
export class TasksController {
  constructor(private readonly viewTask: ViewTask) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const task = await this.viewTask.execute({ actor, taskId: id });
    return { id: task.id, ownerId: task.ownerId, assigneeId: task.assigneeId };
  }
}
