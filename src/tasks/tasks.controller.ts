import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { ReassignTaskDto } from '@/tasks/dto/reassign-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly viewTask: ViewTask,
    private readonly reassignTask: ReassignTask,
  ) {}

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const task = await this.viewTask.execute({ actor, taskId: id });
    return { id: task.id, ownerId: task.ownerId, assigneeId: task.assigneeId };
  }

  @Patch(':id/assignee')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reassign(
    @Param('id') id: string,
    @Body() body: ReassignTaskDto,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.reassignTask.execute({
      actor,
      taskId: id,
      newAssigneeId: body.newAssigneeId,
    });
  }
}
