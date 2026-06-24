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
import { Task } from '@/tasks/domain/task';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { ArchiveTask } from '@/tasks/application/archive-task.use-case';
import { ChangeTaskStatus } from '@/tasks/application/change-task-status.use-case';
import { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import { ReassignTaskDto } from '@/tasks/dto/reassign-task.dto';
import { ArchiveTaskDto } from '@/tasks/dto/archive-task.dto';
import { ChangeTaskStatusDto } from '@/tasks/dto/change-task-status.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTask: CreateTask,
    private readonly viewTask: ViewTask,
    private readonly reassignTask: ReassignTask,
    private readonly archiveTask: ArchiveTask,
    private readonly changeTaskStatus: ChangeTaskStatus,
  ) {}

  @Post()
  async create(@Body() body: CreateTaskDto, @CurrentActor() actor: Actor) {
    const task = await this.createTask.execute({
      actor,
      title: body.title,
      description: body.description,
      // Undefined (omitted) self-assigns; null leaves it unassigned.
      assigneeId: body.assigneeId,
      dueDate: body.dueDate,
      companyId: body.companyId,
    });
    return this.present(task);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const task = await this.viewTask.execute({ actor, taskId: id });
    return this.present(task);
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

  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeTaskStatusDto,
    @CurrentActor() actor: Actor,
  ) {
    const task = await this.changeTaskStatus.execute({
      actor,
      taskId: id,
      status: body.status,
    });
    return this.present(task);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id') id: string,
    @Body() body: ArchiveTaskDto,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.archiveTask.execute({ actor, taskId: id, reason: body.reason });
  }

  /** Serializes a task aggregate into the HTTP response shape. */
  private present(task: Task) {
    return {
      id: task.id,
      ownerId: task.ownerId,
      assigneeId: task.assigneeId,
      dueDate: task.dueDate,
      companyId: task.companyId,
      status: task.status,
    };
  }
}
