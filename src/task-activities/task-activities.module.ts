import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TasksModule } from '@/tasks/tasks.module';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '@/tasks/domain/task.repository';
import { TaskActivitiesController } from '@/task-activities/task-activities.controller';
import {
  TASK_ACTIVITY_REPOSITORY,
  TaskActivityRepository,
} from '@/task-activities/domain/task-activity.repository';
import { PrismaTaskActivityRepository } from '@/task-activities/infrastructure/persistence/prisma-task-activity.repository';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';

/**
 * Composition root for the task-activities context. Binds the
 * TaskActivityRepository port to its Prisma adapter and wires the application
 * service via a factory, keeping the domain and application layers free of any
 * NestJS dependency. Imports TasksModule to reuse the TaskRepository when
 * loading the task an activity is logged against.
 */
@Module({
  imports: [TasksModule],
  providers: [
    {
      provide: TASK_ACTIVITY_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaTaskActivityRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: LogTaskActivity,
      useFactory: (tasks: TaskRepository, activities: TaskActivityRepository) =>
        new LogTaskActivity(tasks, activities),
      inject: [TASK_REPOSITORY, TASK_ACTIVITY_REPOSITORY],
    },
  ],
  controllers: [TaskActivitiesController],
  exports: [LogTaskActivity],
})
export class TaskActivitiesModule {}
