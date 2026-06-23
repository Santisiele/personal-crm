import { PrismaClient } from '@prisma/client';
import { Task, TaskId } from '../../domain/task';
import { TaskRepository } from '../../domain/task.repository';

/**
 * Prisma-backed driven adapter implementing the TaskRepository port.
 *
 * The Task aggregate is a thin authorization view: it owns only its identity,
 * the owner (the user the task belongs to) and the user it is currently
 * assigned to. It deliberately does NOT model the task's content (title,
 * description, status) nor the full assignment history, so this adapter never
 * fabricates that data:
 *
 *  - `ownerId` maps to `task.created_by`.
 *  - `assigneeId` maps to the `user_id` of the most recent `task_assignment`
 *    row; a task with no assignment falls back to its owner, mirroring the
 *    domain default (`Task.create` assigns to the owner when none is given).
 *
 * Consequently `save` only persists a reassignment of an EXISTING task; it does
 * not create `task` rows (there is no such use case and the aggregate carries
 * no data to do so). Because the access policy only lets a task's owner reassign
 * it, the owner is always the actor performing the assignment, so `created_by`
 * is the correct `assigned_by` on the rare path where the first assignment row
 * has to be created.
 */
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(task: Task): Promise<void> {
    const row = await this.prisma.task.findUnique({
      where: { id: BigInt(task.id) },
    });
    if (!row) {
      throw new Error(`Cannot save unknown task '${task.id}'`);
    }

    const current = await this.currentAssignment(task.id);
    if (current) {
      await this.prisma.task_assignment.update({
        where: { id: current.id },
        data: { user_id: BigInt(task.assigneeId) },
      });
      return;
    }

    await this.prisma.task_assignment.create({
      data: {
        task_id: BigInt(task.id),
        user_id: BigInt(task.assigneeId),
        // The owner is the only actor allowed to reassign, so it is always the
        // one assigning here.
        assigned_by: row.created_by,
        status_id: await this.defaultAssignmentStatusId(),
      },
    });
  }

  async findById(id: TaskId): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) {
      return null;
    }
    const current = await this.currentAssignment(id);
    return Task.create({
      id: row.id.toString(),
      ownerId: row.created_by.toString(),
      assigneeId: current
        ? current.user_id.toString()
        : row.created_by.toString(),
    });
  }

  private currentAssignment(taskId: TaskId) {
    return this.prisma.task_assignment.findFirst({
      where: { task_id: BigInt(taskId) },
      orderBy: [{ assigned_at: 'desc' }, { id: 'desc' }],
    });
  }

  /**
   * The aggregate does not model assignment status, so when the first assignment
   * row must be created we fall back to the lowest-id status as a sane default.
   */
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
