import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { ViewAssignmentHistory } from '@/task-assignments/application/view-assignment-history.use-case';
import {
  AssignmentResponse,
  RespondToAssignment,
} from '@/task-assignments/application/respond-to-assignment.use-case';

@Controller('tasks/:taskId/assignments')
export class TaskAssignmentsController {
  constructor(
    private readonly viewAssignmentHistory: ViewAssignmentHistory,
    private readonly respondToAssignment: RespondToAssignment,
  ) {}

  @Get()
  async history(@Param('taskId') taskId: string, @CurrentActor() actor: Actor) {
    const history = await this.viewAssignmentHistory.execute({ actor, taskId });
    return history.map((assignment) => this.serialize(assignment));
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
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
