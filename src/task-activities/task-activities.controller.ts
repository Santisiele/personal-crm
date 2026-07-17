import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';
import { ViewActivityLog } from '@/task-activities/application/view-activity-log.use-case';
import { LogTaskActivityDto } from '@/task-activities/dto/log-task-activity.dto';
import { presentActivity } from '@/task-activities/activity-view';

@ApiTags('task-activities')
@ApiBearerAuth('access-token')
@Controller('tasks')
export class TaskActivitiesController {
  constructor(
    private readonly logTaskActivity: LogTaskActivity,
    private readonly viewActivityLog: ViewActivityLog,
  ) {}

  @Get(':taskId/activities')
  @ApiOperation({
    summary: 'Read the task activity log, most-recent first',
  })
  @ApiParam({ name: 'taskId', description: 'Id of the task' })
  @ApiOkResponse({ description: 'Activity log, most-recent first' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not the task owner nor privileged',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async list(@Param('taskId') taskId: string, @CurrentActor() actor: Actor) {
    const activities = await this.viewActivityLog.execute({ actor, taskId });
    return activities.map((activity) => presentActivity(activity));
  }

  @Post(':taskId/activities')
  @ApiOperation({ summary: 'Log an activity on the task' })
  @ApiParam({ name: 'taskId', description: 'Id of the task' })
  @ApiCreatedResponse({ description: 'Activity logged' })
  @ApiResponse({ status: 400, description: 'Invalid activity payload' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not the task owner nor privileged',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async log(
    @Param('taskId') taskId: string,
    @Body() body: LogTaskActivityDto,
    @CurrentActor() actor: Actor,
  ) {
    const activity = await this.logTaskActivity.execute({
      actor,
      taskId,
      actionType: body.actionType,
      status: body.status,
      activityDate: body.activityDate,
      description: body.description,
      nextAction: body.nextAction,
      nextActionDate: body.nextActionDate,
    });
    return presentActivity(activity);
  }
}
