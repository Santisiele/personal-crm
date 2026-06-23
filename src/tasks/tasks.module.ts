import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksController } from './tasks.controller';
import { TASK_REPOSITORY, TaskRepository } from './domain/task.repository';
import { PrismaTaskRepository } from './infrastructure/persistence/prisma-task.repository';
import { ViewTask } from './application/view-task.use-case';
import { ReassignTask } from './application/reassign-task.use-case';

/**
 * Composition root for the tasks context. Binds the TaskRepository port to its
 * Prisma adapter and wires the application services via factories, keeping the
 * domain and application layers free of any NestJS dependency.
 */
@Module({
  providers: [
    {
      provide: TASK_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaTaskRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ViewTask,
      useFactory: (tasks: TaskRepository) => new ViewTask(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: ReassignTask,
      useFactory: (tasks: TaskRepository) => new ReassignTask(tasks),
      inject: [TASK_REPOSITORY],
    },
  ],
  controllers: [TasksController],
  exports: [ViewTask, ReassignTask],
})
export class TasksModule {}
