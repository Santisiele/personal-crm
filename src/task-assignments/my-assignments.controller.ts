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
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { ListMyPendingAssignments } from '@/task-assignments/application/list-my-pending-assignments.use-case';

@ApiTags('task-assignments')
@ApiBearerAuth('access-token')
@Controller('me/assignments')
export class MyAssignmentsController {
  constructor(
    private readonly listMyPendingAssignments: ListMyPendingAssignments,
  ) {}

  @Get('pending')
  @ApiOperation({
    summary: "List the authenticated user's pending assignments (their inbox)",
  })
  @ApiOkResponse({
    description:
      'Pending assignments addressed to the actor, most-recent first.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async pending(@CurrentActor() actor: Actor) {
    const assignments = await this.listMyPendingAssignments.execute({ actor });
    return assignments.map((assignment) => this.serialize(assignment));
  }

  private serialize(assignment: TaskAssignment) {
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      assigneeId: assignment.assigneeId,
      assignedById: assignment.assignedById,
      status: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }
}
