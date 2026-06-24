import { PrismaClient } from '@prisma/client';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';

/**
 * Prisma-backed driven adapter implementing the TaskActivityRepository port.
 *
 * Maps the activity aggregate to a `task_activity` row. The author maps to both
 * `user_id` and `created_by`. The aggregate keeps statuses/types out of the
 * domain as plain descriptions, so this adapter resolves them against the
 * `activity_status` and `action_type` lookups by description — mirroring the
 * resolve-by-description helpers in PrismaTaskRepository — and fails loudly when
 * a lookup row is missing (it must be seeded).
 */
export class PrismaTaskActivityRepository implements TaskActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(activity: TaskActivity): Promise<void> {
    if (activity.id !== null) {
      return;
    }
    const author = BigInt(activity.authorId);
    const created = await this.prisma.task_activity.create({
      data: {
        task_id: BigInt(activity.taskId),
        user_id: author,
        created_by: author,
        activity_date: new Date(activity.activityDate),
        description: activity.description,
        next_action: activity.nextAction,
        next_action_date: activity.nextActionDate
          ? new Date(activity.nextActionDate)
          : null,
        status_id: await this.activityStatusId(activity.status),
        action_type_id: await this.actionTypeId(activity.actionType),
      },
    });
    activity.assignId(created.id.toString());
  }

  // The aggregate does not model activity statuses/types; they are looked up by
  // description, so the lookup rows must be seeded. We fail loudly if missing.
  private async activityStatusId(description: string): Promise<bigint> {
    const row = await this.prisma.activity_status.findFirst({
      where: { description },
    });
    if (!row) {
      throw new Error(
        `No activity_status '${description}' found; cannot log the activity`,
      );
    }
    return row.id;
  }

  private async actionTypeId(description: string): Promise<bigint> {
    const row = await this.prisma.action_type.findFirst({
      where: { description },
    });
    if (!row) {
      throw new Error(
        `No action_type '${description}' found; cannot log the activity`,
      );
    }
    return row.id;
  }
}
