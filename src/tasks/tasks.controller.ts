import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { ArchiveTask } from '@/tasks/application/archive-task.use-case';
import { ChangeTaskStatus } from '@/tasks/application/change-task-status.use-case';
import { EditTask } from '@/tasks/application/edit-task.use-case';
import { ListTasks } from '@/tasks/application/list-tasks.use-case';
import { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import { EditTaskDto } from '@/tasks/dto/edit-task.dto';
import { ListTasksQueryDto } from '@/tasks/dto/list-tasks-query.dto';
import { ReassignTaskDto } from '@/tasks/dto/reassign-task.dto';
import { ArchiveTaskDto } from '@/tasks/dto/archive-task.dto';
import { ChangeTaskStatusDto } from '@/tasks/dto/change-task-status.dto';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTask: CreateTask,
    private readonly viewTask: ViewTask,
    private readonly reassignTask: ReassignTask,
    private readonly archiveTask: ArchiveTask,
    private readonly changeTaskStatus: ChangeTaskStatus,
    private readonly editTask: EditTask,
    private readonly listTasks: ListTasks,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a task (self-assigned by default; assigning to others requires privilege)',
  })
  @ApiCreatedResponse({
    description: 'Task created, including dueDate, companyId and status.',
  })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Assigning to another user without privilege.',
  })
  async create(@Body() body: CreateTaskDto, @CurrentActor() actor: Actor) {
    const task = await this.createTask.execute({
      actor,
      title: body.title,
      description: body.description,
      // Undefined (omitted) self-assigns; null leaves it unassigned.
      assigneeId: body.assigneeId,
      dueDate: body.dueDate,
      companyId: body.companyId,
      contactId: body.contactId,
    });
    return this.present(task);
  }

  @Get()
  @ApiOperation({
    summary:
      'List tasks visible to the actor (owner/assignee; privileged see all)',
  })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiOkResponse({ description: 'Visible tasks, excluding archived ones.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async findAll(
    @Query() query: ListTasksQueryDto,
    @CurrentActor() actor: Actor,
  ) {
    const tasks = await this.listTasks.execute({
      actor,
      filter: { assigneeId: query.assigneeId, companyId: query.companyId },
    });
    return tasks.map((task) => this.present(task));
  }

  @Get(':id')
  @ApiOperation({ summary: 'View a task by id' })
  @ApiParam({ name: 'id', description: 'Task id.' })
  @ApiOkResponse({
    description: 'Task detail, including dueDate, companyId and status.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Not allowed to view this task.' })
  @ApiResponse({ status: 404, description: 'Task not found or archived.' })
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const task = await this.viewTask.execute({ actor, taskId: id });
    return this.present(task);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit a task (title, description, due date; owner, assignee or privileged)',
  })
  @ApiParam({ name: 'id', description: 'Task id.' })
  @ApiOkResponse({ description: 'Updated task.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Not allowed to edit this task.' })
  @ApiResponse({ status: 404, description: 'Task not found or archived.' })
  async edit(
    @Param('id') id: string,
    @Body() body: EditTaskDto,
    @CurrentActor() actor: Actor,
  ) {
    const task = await this.editTask.execute({
      actor,
      taskId: id,
      title: body.title,
      description: body.description,
      // Undefined leaves the field unchanged; null clears it.
      dueDate: body.dueDate,
      companyId: body.companyId,
      contactId: body.contactId,
    });
    return this.present(task);
  }

  @Patch(':id/assignee')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reassign a task (owner only)' })
  @ApiParam({ name: 'id', description: 'Task id.' })
  @ApiNoContentResponse({ description: 'Task reassigned.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Only the owner can reassign.' })
  @ApiResponse({ status: 404, description: 'Task not found or archived.' })
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
  @ApiOperation({ summary: 'Change a task status' })
  @ApiParam({ name: 'id', description: 'Task id.' })
  @ApiOkResponse({ description: 'Updated task with its new status.' })
  @ApiResponse({ status: 400, description: 'Invalid status value.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to change this task status.',
  })
  @ApiResponse({ status: 404, description: 'Task not found or archived.' })
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
  @ApiOperation({
    summary: 'Archive a task (logical delete; owner or privileged)',
  })
  @ApiParam({ name: 'id', description: 'Task id.' })
  @ApiNoContentResponse({ description: 'Task archived.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the owner or a privileged user can archive.',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found or already archived.',
  })
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
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      companyId: task.companyId,
      contactId: task.contactId,
      status: task.status,
    };
  }
}
