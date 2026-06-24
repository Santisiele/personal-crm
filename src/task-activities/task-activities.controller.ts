import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';
import { LogTaskActivityDto } from '@/task-activities/dto/log-task-activity.dto';

@Controller('tasks')
export class TaskActivitiesController {
  constructor(private readonly logTaskActivity: LogTaskActivity) {}

  @Post(':taskId/activities')
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
    return {
      id: activity.id,
      taskId: activity.taskId,
      actionType: activity.actionType,
      status: activity.status,
      activityDate: activity.activityDate,
    };
  }
}
