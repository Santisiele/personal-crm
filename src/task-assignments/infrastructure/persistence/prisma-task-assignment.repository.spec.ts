import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AssignmentStatus } from '@/task-assignments/domain/assignment-status';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { PrismaTaskAssignmentRepository } from '@/task-assignments/infrastructure/persistence/prisma-task-assignment.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaTaskAssignmentRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaTaskAssignmentRepository;

  let userRoleId: bigint;
  let taskStatusId: bigint;
  let pendingStatusId: bigint;
  let acceptedStatusId: bigint;
  let ownerId: bigint;
  let assigneeId: bigint;
  let taskId: bigint;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaTaskAssignmentRepository(prisma);

    const role = await prisma.user_role.create({
      data: { description: 'IT-ASSIGNMENT-ROLE' },
    });
    userRoleId = role.id;

    const owner = await prisma.app_user.create({
      data: {
        name: 'Assignment Owner',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    ownerId = owner.id;

    const assignee = await prisma.app_user.create({
      data: {
        name: 'Assignment Assignee',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    assigneeId = assignee.id;

    const taskStatus = await prisma.task_status.create({
      data: { description: 'IT-ASSIGNMENT-TASK-STATUS' },
    });
    taskStatusId = taskStatus.id;

    const task = await prisma.task.create({
      data: {
        title: 'Integration task',
        description: 'created for the assignment integration test',
        status_id: taskStatusId,
        created_by: ownerId,
      },
    });
    taskId = task.id;

    const pending = await prisma.assignment_status.create({
      data: { description: AssignmentStatus.PENDING },
    });
    pendingStatusId = pending.id;
    const accepted = await prisma.assignment_status.create({
      data: { description: AssignmentStatus.ACCEPTED },
    });
    acceptedStatusId = accepted.id;
  });

  afterAll(async () => {
    await prisma.task_assignment.deleteMany({ where: { task_id: taskId } });
    await prisma.task.deleteMany({ where: { id: taskId } });
    await prisma.app_user.deleteMany({
      where: { id: { in: [ownerId, assigneeId] } },
    });
    await prisma.task_status.deleteMany({ where: { id: taskStatusId } });
    await prisma.assignment_status.deleteMany({
      where: { id: { in: [pendingStatusId, acceptedStatusId] } },
    });
    await prisma.user_role.deleteMany({ where: { id: userRoleId } });
    await prisma.$disconnect();
  });

  it('inserts a pending assignment resolving the status by description', async () => {
    const assignment = TaskAssignment.create({
      taskId: taskId.toString(),
      assigneeId: assigneeId.toString(),
      assignedById: ownerId.toString(),
    });

    await repository.save(assignment);

    expect(assignment.id).not.toBeNull();
    const row = await prisma.task_assignment.findUnique({
      where: { id: BigInt(assignment.id!) },
    });
    expect(row).not.toBeNull();
    expect(row!.task_id.toString()).toBe(taskId.toString());
    expect(row!.user_id.toString()).toBe(assigneeId.toString());
    expect(row!.assigned_by.toString()).toBe(ownerId.toString());
    expect(row!.status_id.toString()).toBe(pendingStatusId.toString());
  });

  it('reads a task assignment history most-recent first', async () => {
    const older = TaskAssignment.create({
      taskId: taskId.toString(),
      assigneeId: assigneeId.toString(),
      assignedById: ownerId.toString(),
      assignedAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newer = TaskAssignment.create({
      taskId: taskId.toString(),
      assigneeId: ownerId.toString(),
      assignedById: ownerId.toString(),
      assignedAt: new Date('2026-03-01T00:00:00Z'),
    });
    await repository.save(older);
    await repository.save(newer);

    const history = await repository.findByTaskId(taskId.toString());

    expect(history.length).toBeGreaterThanOrEqual(2);
    // The most-recent (newer) entry precedes the older one.
    const newerIndex = history.findIndex((a) => a.id === newer.id);
    const olderIndex = history.findIndex((a) => a.id === older.id);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it('updates the status in place when the assignee accepts', async () => {
    const assignment = TaskAssignment.create({
      taskId: taskId.toString(),
      assigneeId: assigneeId.toString(),
      assignedById: ownerId.toString(),
    });
    await repository.save(assignment);

    assignment.accept();
    await repository.save(assignment);

    const reloaded = await repository.findById(assignment.id!);
    expect(reloaded!.status).toBe(AssignmentStatus.ACCEPTED);
    const row = await prisma.task_assignment.findUnique({
      where: { id: BigInt(assignment.id!) },
    });
    expect(row!.status_id.toString()).toBe(acceptedStatusId.toString());
  });
});
