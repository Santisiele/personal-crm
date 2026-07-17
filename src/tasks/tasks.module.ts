import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersModule } from '@/users/users.module';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@/users/domain/user.repository';
import { TasksController } from '@/tasks/tasks.controller';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '@/tasks/domain/task.repository';
import { PrismaTaskRepository } from '@/tasks/infrastructure/persistence/prisma-task.repository';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { ArchiveTask } from '@/tasks/application/archive-task.use-case';
import { ChangeTaskStatus } from '@/tasks/application/change-task-status.use-case';
import { EditTask } from '@/tasks/application/edit-task.use-case';
import { ListTasks } from '@/tasks/application/list-tasks.use-case';

/**
 * Composition root for the tasks context. Binds the TaskRepository port to its
 * Prisma adapter and wires the application services via factories, keeping the
 * domain and application layers free of any NestJS dependency.
 */
@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: TASK_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaTaskRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateTask,
      useFactory: (tasks: TaskRepository) => new CreateTask(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: ViewTask,
      useFactory: (tasks: TaskRepository) => new ViewTask(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: ReassignTask,
      useFactory: (tasks: TaskRepository, users: UserRepository) =>
        new ReassignTask(tasks, users),
      inject: [TASK_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: ArchiveTask,
      useFactory: (tasks: TaskRepository) => new ArchiveTask(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: ChangeTaskStatus,
      useFactory: (tasks: TaskRepository) => new ChangeTaskStatus(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: EditTask,
      useFactory: (tasks: TaskRepository) => new EditTask(tasks),
      inject: [TASK_REPOSITORY],
    },
    {
      provide: ListTasks,
      useFactory: (tasks: TaskRepository) => new ListTasks(tasks),
      inject: [TASK_REPOSITORY],
    },
  ],
  controllers: [TasksController],
  exports: [
    TASK_REPOSITORY,
    CreateTask,
    ViewTask,
    ReassignTask,
    ArchiveTask,
    ChangeTaskStatus,
    EditTask,
    ListTasks,
  ],
})
export class TasksModule {}
