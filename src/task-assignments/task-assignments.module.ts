import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TasksModule } from '@/tasks/tasks.module';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '@/tasks/domain/task.repository';
import { TaskAssignmentsController } from '@/task-assignments/task-assignments.controller';
import {
  TASK_ASSIGNMENT_REPOSITORY,
  TaskAssignmentRepository,
} from '@/task-assignments/domain/task-assignment.repository';
import { PrismaTaskAssignmentRepository } from '@/task-assignments/infrastructure/persistence/prisma-task-assignment.repository';
import { ViewAssignmentHistory } from '@/task-assignments/application/view-assignment-history.use-case';
import { RespondToAssignment } from '@/task-assignments/application/respond-to-assignment.use-case';

/**
 * Composition root for the task-assignments context. Binds the
 * TaskAssignmentRepository port to its Prisma adapter and wires the application
 * services via factories, keeping the domain and application layers free of any
 * NestJS dependency. Imports TasksModule to reuse the TaskRepository (and its
 * access policy) when authorizing reads of a task's assignment history.
 */
@Module({
  imports: [TasksModule],
  providers: [
    {
      provide: TASK_ASSIGNMENT_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaTaskAssignmentRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ViewAssignmentHistory,
      useFactory: (
        tasks: TaskRepository,
        assignments: TaskAssignmentRepository,
      ) => new ViewAssignmentHistory(tasks, assignments),
      inject: [TASK_REPOSITORY, TASK_ASSIGNMENT_REPOSITORY],
    },
    {
      provide: RespondToAssignment,
      useFactory: (assignments: TaskAssignmentRepository) =>
        new RespondToAssignment(assignments),
      inject: [TASK_ASSIGNMENT_REPOSITORY],
    },
  ],
  controllers: [TaskAssignmentsController],
  exports: [
    TASK_ASSIGNMENT_REPOSITORY,
    ViewAssignmentHistory,
    RespondToAssignment,
  ],
})
export class TaskAssignmentsModule {}
