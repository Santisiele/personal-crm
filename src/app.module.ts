import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskActivitiesModule } from './task-activities/task-activities.module';
import { TaskAssignmentsModule } from './task-assignments/task-assignments.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}