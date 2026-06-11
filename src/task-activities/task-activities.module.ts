import { Module } from '@nestjs/common';
import { TaskActivitiesService } from './task-activities.service';
import { TaskActivitiesController } from './task-activities.controller';

@Module({
  providers: [TaskActivitiesService],
  controllers: [TaskActivitiesController]
})
export class TaskActivitiesModule {}
