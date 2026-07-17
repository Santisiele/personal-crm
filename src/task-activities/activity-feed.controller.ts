import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { ViewAllActivity } from '@/task-activities/application/view-all-activity.use-case';
import { presentActivity } from '@/task-activities/activity-view';

@ApiTags('task-activities')
@ApiBearerAuth('access-token')
@Controller('activities')
export class ActivityFeedController {
  constructor(private readonly viewAllActivity: ViewAllActivity) {}

  @Get()
  @ApiOperation({
    summary: 'Global activity feed across all tasks (ADMIN/CREATOR only)',
  })
  @ApiOkResponse({
    description: 'Every logged activity, most-recent first.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  async findAll(@CurrentActor() actor: Actor) {
    const activities = await this.viewAllActivity.execute({ actor });
    return activities.map((activity: TaskActivity) =>
      presentActivity(activity),
    );
  }
}
