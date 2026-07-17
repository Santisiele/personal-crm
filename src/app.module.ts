import { join } from 'node:path';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
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

@Module({
  imports: [
    // Serves the built React SPA under /app in production (a single monolithic
    // process for both the API at the root and the web client). The frontend is
    // built to web/dist; when that folder is absent (e.g. API-only dev), this
    // simply serves nothing. The API keeps the root path, so the SPA lives under
    // its own /app prefix and never collides with API routes.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'web', 'dist'),
      serveRoot: '/app',
      // Unknown /app/* GETs fall back to index.html so client-side routing works.
      serveStaticOptions: { fallthrough: true },
    }),
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
