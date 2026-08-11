import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { DomainExceptionFilter } from '@/common/filters/domain-exception.filter';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { CompaniesModule } from '@/companies/companies.module';
import { ContactsModule } from '@/contacts/contacts.module';
import { TasksModule } from '@/tasks/tasks.module';
import { TaskActivitiesModule } from '@/task-activities/task-activities.module';
import { TaskAssignmentsModule } from '@/task-assignments/task-assignments.module';
import { FollowUpsModule } from '@/follow-ups/follow-ups.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    TasksModule,
    TaskActivitiesModule,
    TaskAssignmentsModule,
    FollowUpsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
  ],
})
export class AppModule {}
