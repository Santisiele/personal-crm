import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import { ReassignTaskDto } from '@/tasks/dto/reassign-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTask: CreateTask,
    private readonly viewTask: ViewTask,
    private readonly reassignTask: ReassignTask,
  ) {}

  @Post()
  async create(@Body() body: CreateTaskDto, @CurrentActor() actor: Actor) {
    const task = await this.createTask.execute({
      actor,
      title: body.title,
      description: body.description,
      // Undefined (omitted) self-assigns; null leaves it unassigned.
      assigneeId: body.assigneeId,
    });
    return { id: task.id, ownerId: task.ownerId, assigneeId: task.assigneeId };
  }

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
