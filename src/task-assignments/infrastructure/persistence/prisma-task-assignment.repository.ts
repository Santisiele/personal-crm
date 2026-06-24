import { PrismaClient } from '@prisma/client';
import { AssignmentStatus } from '@/task-assignments/domain/assignment-status';
import {
  TaskAssignment,
  TaskAssignmentId,
} from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentRepository } from '@/task-assignments/domain/task-assignment.repository';

/**
 * Prisma-backed driven adapter implementing the TaskAssignmentRepository port.
 *
 * Maps the assignment aggregate to a `task_assignment` row:
 *  - `assigneeId`   ↔ `user_id`
 *  - `assignedById` ↔ `assigned_by`
 *  - `assignedAt`   ↔ `assigned_at`
 *  - `status`       ↔ the `assignment_status` looked up by description.
 *
 * The aggregate keeps statuses out of the domain as plain descriptions
 * (PENDING/ACCEPTED/REJECTED), so this adapter resolves them against the
 * `assignment_status` lookup by description — mirroring the resolve-by-
 * description helpers in PrismaTaskRepository. If the matching status row is
 * missing, it falls back to the lowest-id status as a sane default (matching how
 * the tasks adapter defaults a brand-new assignment's status), so the history
 * remains readable/writable even before the lifecycle lookups are seeded.
 *
 * `save` dispatches on identity: no id → INSERT a new history row; an existing
 * id → update that row's status in place (accept/reject).
 */
export class PrismaTaskAssignmentRepository implements TaskAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(assignment: TaskAssignment): Promise<void> {
    const statusId = await this.statusId(assignment.status);
    if (assignment.id === null) {
      const created = await this.prisma.task_assignment.create({
        data: {
          task_id: BigInt(assignment.taskId),
          user_id: BigInt(assignment.assigneeId),
          assigned_by: BigInt(assignment.assignedById),
          assigned_at: assignment.assignedAt,
          status_id: statusId,
        },
      });
      assignment.assignId(created.id.toString());
      return;
    }
    await this.prisma.task_assignment.update({
      where: { id: BigInt(assignment.id) },
      data: { status_id: statusId },
    });
  }

  async findByTaskId(taskId: string): Promise<TaskAssignment[]> {
    const rows = await this.prisma.task_assignment.findMany({
      where: { task_id: BigInt(taskId) },
      include: { assignment_status: true },
      // Most-recent first, mirroring how the tasks adapter resolves the current
      // assignment.
      orderBy: [{ assigned_at: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) =>
      TaskAssignment.rehydrate({
        id: row.id.toString(),
        taskId: row.task_id.toString(),
        assigneeId: row.user_id.toString(),
        assignedById: row.assigned_by.toString(),
        status: this.toStatus(row.assignment_status.description),
        assignedAt: row.assigned_at,
      }),
    );
  }

  async findById(id: TaskAssignmentId): Promise<TaskAssignment | null> {
    const row = await this.prisma.task_assignment.findUnique({
      where: { id: BigInt(id) },
      include: { assignment_status: true },
    });
    if (!row) {
      return null;
    }
    return TaskAssignment.rehydrate({
      id: row.id.toString(),
      taskId: row.task_id.toString(),
      assigneeId: row.user_id.toString(),
      assignedById: row.assigned_by.toString(),
      status: this.toStatus(row.assignment_status.description),
      assignedAt: row.assigned_at,
    });
  }

  /**
   * Resolves the lookup id for a status description, falling back to the
   * lowest-id status when the description has not been seeded (mirroring how the
   * tasks adapter defaults a brand-new assignment's status).
   */
  private async statusId(status: AssignmentStatus): Promise<bigint> {
    const match = await this.prisma.assignment_status.findFirst({
      where: { description: status },
    });
    if (match) {
      return match.id;
    }
    const fallback = await this.prisma.assignment_status.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!fallback) {
      throw new Error(
        'No assignment_status rows found; cannot persist a task assignment',
      );
    }
    return fallback.id;
  }

  /** Maps a stored description back to the domain status, defaulting to PENDING. */
  private toStatus(description: string): AssignmentStatus {
    return (Object.values(AssignmentStatus) as string[]).includes(description)
      ? (description as AssignmentStatus)
      : AssignmentStatus.PENDING;
  }
}
