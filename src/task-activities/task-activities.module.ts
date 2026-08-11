import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TasksModule } from '@/tasks/tasks.module';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '@/tasks/domain/task.repository';
import { TaskActivitiesController } from '@/task-activities/task-activities.controller';
import { ActivityFeedController } from '@/task-activities/activity-feed.controller';
import {
  TASK_ACTIVITY_REPOSITORY,
  TaskActivityRepository,
} from '@/task-activities/domain/task-activity.repository';
import { PrismaTaskActivityRepository } from '@/task-activities/infrastructure/persistence/prisma-task-activity.repository';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';
import { ViewActivityLog } from '@/task-activities/application/view-activity-log.use-case';
import { ViewAllActivity } from '@/task-activities/application/view-all-activity.use-case';

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
    {
      provide: ViewActivityLog,
      useFactory: (tasks: TaskRepository, activities: TaskActivityRepository) =>
        new ViewActivityLog(tasks, activities),
      inject: [TASK_REPOSITORY, TASK_ACTIVITY_REPOSITORY],
    },
    {
      provide: ViewAllActivity,
      useFactory: (activities: TaskActivityRepository) =>
        new ViewAllActivity(activities),
      inject: [TASK_ACTIVITY_REPOSITORY],
    },
  ],
  controllers: [TaskActivitiesController, ActivityFeedController],
  exports: [
    TASK_ACTIVITY_REPOSITORY,
    LogTaskActivity,
    ViewActivityLog,
    ViewAllActivity,
  ],
})
export class TaskActivitiesModule {}
