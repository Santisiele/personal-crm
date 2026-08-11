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
import { ListFollowUps } from '@/follow-ups/application/list-follow-ups.use-case';

@ApiTags('follow-ups')
@ApiBearerAuth('access-token')
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly listFollowUps: ListFollowUps) {}

  @Get()
  @ApiOperation({
    summary:
      'Follow-up board: one row per visible task, ordered by next action',
  })
  @ApiOkResponse({
    description:
      'A row per task the actor may see, with company/contact, latest action ' +
      'and next step, soonest next action first.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async findAll(@CurrentActor() actor: Actor) {
    return this.listFollowUps.execute({ actor });
  }
}
