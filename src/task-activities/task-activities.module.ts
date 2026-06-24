import { Module } from '@nestjs/common';
import { TaskActivitiesService } from '@/task-activities/task-activities.service';
import { TaskActivitiesController } from '@/task-activities/task-activities.controller';

@Module({
  providers: [TaskActivitiesService],
  controllers: [TaskActivitiesController],
})
export class TaskActivitiesModule {}
