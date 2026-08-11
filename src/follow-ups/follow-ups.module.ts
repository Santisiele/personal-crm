import { Module } from '@nestjs/common';
import { TasksModule } from '@/tasks/tasks.module';
import { TaskActivitiesModule } from '@/task-activities/task-activities.module';
import { CompaniesModule } from '@/companies/companies.module';
import { ContactsModule } from '@/contacts/contacts.module';
import { UsersModule } from '@/users/users.module';
import {
  TASK_REPOSITORY,
  TaskRepository,
} from '@/tasks/domain/task.repository';
import {
  TASK_ACTIVITY_REPOSITORY,
  TaskActivityRepository,
} from '@/task-activities/domain/task-activity.repository';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '@/companies/domain/company.repository';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from '@/contacts/domain/contact.repository';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@/users/domain/user.repository';
import { FollowUpsController } from '@/follow-ups/follow-ups.controller';
import { ListFollowUps } from '@/follow-ups/application/list-follow-ups.use-case';

/**
 * Composition root for the follow-up board. It joins across contexts (tasks,
 * activities, companies, contacts, users) into a single read model, so it just
 * imports those modules and reuses their repository ports — the query owns no
 * persistence of its own.
 */
@Module({
  imports: [
    TasksModule,
    TaskActivitiesModule,
    CompaniesModule,
    ContactsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: ListFollowUps,
      useFactory: (
        tasks: TaskRepository,
        activities: TaskActivityRepository,
        companies: CompanyRepository,
        contacts: ContactRepository,
        users: UserRepository,
      ) => new ListFollowUps(tasks, activities, companies, contacts, users),
      inject: [
        TASK_REPOSITORY,
        TASK_ACTIVITY_REPOSITORY,
        COMPANY_REPOSITORY,
        CONTACT_REPOSITORY,
        USER_REPOSITORY,
      ],
    },
  ],
  controllers: [FollowUpsController],
})
export class FollowUpsModule {}
