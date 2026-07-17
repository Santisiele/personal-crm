import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';

/** Most-recent first: by activityDate then id (numeric), descending. */
function mostRecentFirst(a: TaskActivity, b: TaskActivity): number {
  const byDate = b.activityDate.localeCompare(a.activityDate);
  return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
}

/**
 * In-memory driven adapter for task activities. Used in acceptance/unit tests
 * and local development. Owns identity for new activities via a simple counter,
 * mirroring the database's autoincrement behaviour.
 */
export class InMemoryTaskActivityRepository implements TaskActivityRepository {
  private readonly activities: TaskActivity[] = [];
  private sequence = 0;

  save(activity: TaskActivity): Promise<void> {
    if (activity.id === null) {
      this.sequence += 1;
      activity.assignId(String(this.sequence));
    }
    this.activities.push(activity);
    return Promise.resolve();
  }

  findByTaskId(taskId: string): Promise<TaskActivity[]> {
    const log = this.activities
      .filter((activity) => activity.taskId === taskId)
      .sort(mostRecentFirst);
    return Promise.resolve(log);
  }

  findAll(): Promise<TaskActivity[]> {
    return Promise.resolve([...this.activities].sort(mostRecentFirst));
  }

  /** Test/inspection helper: all activities saved so far. */
  all(): TaskActivity[] {
    return [...this.activities];
  }
}
