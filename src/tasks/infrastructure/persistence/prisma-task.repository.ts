import { PrismaClient } from '@prisma/client';
import { Task, TaskId } from '@/tasks/domain/task';
import { TaskRepository } from '@/tasks/domain/task.repository';

/** Lookup descriptions used to record a task's archival as an activity. */
const ARCHIVED_ACTIVITY_STATUS = 'DELETED';
const ARCHIVE_ACTION_TYPE = 'ARCHIVE';

/**
 * Prisma-backed driven adapter implementing the TaskRepository port.
 *
 * The Task aggregate is a thin authorization view enriched with the data needed
 * to create a task: its identity, owner, current assignee, title and
 * description. It deliberately does NOT model the full assignment history nor
 * statuses, so this adapter maps as follows:
 *
 *  - `ownerId` maps to `task.created_by`.
 *  - `assigneeId` maps to the `user_id` of the most recent `task_assignment`
 *    row; a task with no assignment falls back to its owner on read, mirroring
 *    the domain default (`Task.rehydrate` assigns to the owner when none is
 *    given).
 *
 * `save` dispatches on identity: a task with no id is a brand-new task (INSERT
 * the `task` row, then an optional `task_assignment` when it has an assignee);
 * a task with an id is an existing one being reassigned (update the current
 * assignment in place, never appending history). Because the access policy only
 * lets a task's owner reassign it, the owner is always the actor assigning, so
 * `created_by` is the correct `assigned_by`.
 *
 * The aggregate does not model statuses, so when a row that needs one is created
 * we fall back to the lowest-id status as a sane default.
 */
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(task: Task): Promise<void> {
    if (task.id === null) {
      await this.create(task);
    } else {
      await this.persistReassignment(task, task.id);
    }
  }

  async findById(id: TaskId): Promise<Task | null> {
    const row = await this.prisma.task.findFirst({
      where: { id: BigInt(id), deleted_at: null },
    });
    if (!row) {
      return null;
    }
    const current = await this.currentAssignment(id);
    return Task.rehydrate({
      id: row.id.toString(),
      ownerId: row.created_by.toString(),
      assigneeId: current
        ? current.user_id.toString()
        : row.created_by.toString(),
      title: row.title,
      description: row.description,
    });
  }

  private async create(task: Task): Promise<void> {
    const ownerId = BigInt(task.ownerId);
    const created = await this.prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        created_by: ownerId,
        status_id: await this.defaultTaskStatusId(),
      },
    });
    task.assignId(created.id.toString());

    // An unassigned task simply has no task_assignment row.
    if (task.assigneeId !== null) {
      await this.prisma.task_assignment.create({
        data: {
          task_id: created.id,
          user_id: BigInt(task.assigneeId),
          // The creator owns the task, so it is the one assigning.
          assigned_by: ownerId,
          status_id: await this.defaultAssignmentStatusId(),
        },
      });
    }
  }

  private async persistReassignment(task: Task, id: TaskId): Promise<void> {
    const row = await this.prisma.task.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) {
      throw new Error(`Cannot save unknown task '${id}'`);
    }
    if (task.assigneeId === null) {
      throw new Error(`Cannot unassign an existing task ('${id}')`);
    }

    const current = await this.currentAssignment(id);
    if (current) {
      await this.prisma.task_assignment.update({
        where: { id: current.id },
        data: { user_id: BigInt(task.assigneeId) },
      });
      return;
    }

    await this.prisma.task_assignment.create({
      data: {
        task_id: BigInt(id),
        user_id: BigInt(task.assigneeId),
        // The owner is the only actor allowed to reassign, so it is always the
        // one assigning here.
        assigned_by: row.created_by,
        status_id: await this.defaultAssignmentStatusId(),
      },
    });
  }

  async archive(id: TaskId, reason: string, archivedBy: string): Promise<void> {
    const actor = BigInt(archivedBy);
    await this.prisma.task.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date(), deleted_by: actor },
    });
    // Record the archival (with its reason) as a task activity whose status
    // marks it as a deletion, mirroring how the model tracks task follow-up.
    await this.prisma.task_activity.create({
      data: {
        task_id: BigInt(id),
        user_id: actor,
        created_by: actor,
        activity_date: new Date(),
        description: reason,
        status_id: await this.archivedActivityStatusId(),
        action_type_id: await this.archiveActionTypeId(),
      },
    });
  }

  // The aggregate does not model activity statuses/types, so the archival lookup
  // rows must be seeded; we fail loudly if they are missing.
  private async archivedActivityStatusId(): Promise<bigint> {
    const row = await this.prisma.activity_status.findFirst({
      where: { description: ARCHIVED_ACTIVITY_STATUS },
    });
    if (!row) {
      throw new Error(
        `No activity_status '${ARCHIVED_ACTIVITY_STATUS}' found; cannot record the archival`,
      );
    }
    return row.id;
  }

  private async archiveActionTypeId(): Promise<bigint> {
    const row = await this.prisma.action_type.findFirst({
      where: { description: ARCHIVE_ACTION_TYPE },
    });
    if (!row) {
      throw new Error(
        `No action_type '${ARCHIVE_ACTION_TYPE}' found; cannot record the archival`,
      );
    }
    return row.id;
  }

  private currentAssignment(taskId: TaskId) {
    return this.prisma.task_assignment.findFirst({
      where: { task_id: BigInt(taskId) },
      orderBy: [{ assigned_at: 'desc' }, { id: 'desc' }],
    });
  }

  private async defaultTaskStatusId(): Promise<bigint> {
    const row = await this.prisma.task_status.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!row) {
      throw new Error('No task_status rows found; cannot create a task');
    }
    return row.id;
  }

  private async defaultAssignmentStatusId(): Promise<bigint> {
    const row = await this.prisma.assignment_status.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!row) {
      throw new Error(
        'No assignment_status rows found; cannot create a task assignment',
      );
    }
    return row.id;
  }
}
