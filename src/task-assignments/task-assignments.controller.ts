import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { ViewAssignmentHistory } from '@/task-assignments/application/view-assignment-history.use-case';
import {
  AssignmentResponse,
  RespondToAssignment,
} from '@/task-assignments/application/respond-to-assignment.use-case';

@ApiTags('task-assignments')
@ApiBearerAuth('access-token')
@Controller('tasks/:taskId/assignments')
export class TaskAssignmentsController {
  constructor(
    private readonly viewAssignmentHistory: ViewAssignmentHistory,
    private readonly respondToAssignment: RespondToAssignment,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Read the full assignment history, most-recent first',
  })
  @ApiParam({ name: 'taskId', description: 'Id of the task' })
  @ApiOkResponse({ description: 'Assignment history, most-recent first' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not the task owner nor privileged',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async history(@Param('taskId') taskId: string, @CurrentActor() actor: Actor) {
    const history = await this.viewAssignmentHistory.execute({ actor, taskId });
    return history.map((assignment) => this.serialize(assignment));
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an assignment (assignee only)' })
  @ApiParam({ name: 'taskId', description: 'Id of the task' })
  @ApiParam({ name: 'id', description: 'Id of the assignment' })
  @ApiOkResponse({ description: 'Assignment accepted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Actor is not the assignee' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async accept(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const assignment = await this.respondToAssignment.execute({
      actor,
      assignmentId: id,
      response: AssignmentResponse.ACCEPT,
    });
    return this.serialize(assignment);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an assignment (assignee only)' })
  @ApiParam({ name: 'taskId', description: 'Id of the task' })
  @ApiParam({ name: 'id', description: 'Id of the assignment' })
  @ApiOkResponse({ description: 'Assignment rejected' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Actor is not the assignee' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async reject(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const assignment = await this.respondToAssignment.execute({
      actor,
      assignmentId: id,
      response: AssignmentResponse.REJECT,
    });
    return this.serialize(assignment);
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
