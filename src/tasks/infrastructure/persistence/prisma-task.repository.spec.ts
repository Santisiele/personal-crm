import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Task } from '@/tasks/domain/task';
import { PrismaTaskRepository } from '@/tasks/infrastructure/persistence/prisma-task.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaTaskRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaTaskRepository;

  let userRoleId: bigint;
  let taskStatusId: bigint;
  let assignmentStatusId: bigint;
  let ownerId: bigint;
  let otherUserId: bigint;
  let taskId: bigint;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaTaskRepository(prisma);

    // The schema is heavily normalized; create the lookup/FK rows the adapter
    // and the task row depend on.
    const role = await prisma.user_role.create({
      data: { description: 'IT-TASK-ROLE' },
    });
    userRoleId = role.id;

    const owner = await prisma.app_user.create({
      data: {
        name: 'Task Owner',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    ownerId = owner.id;

    const other = await prisma.app_user.create({
      data: {
        name: 'Other User',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    otherUserId = other.id;

    const taskStatus = await prisma.task_status.create({
      data: { description: 'IT-TASK-STATUS' },
    });
    taskStatusId = taskStatus.id;

    const assignmentStatus = await prisma.assignment_status.create({
      data: { description: 'IT-ASSIGNMENT-STATUS' },
    });
    assignmentStatusId = assignmentStatus.id;

    const task = await prisma.task.create({
      data: {
        title: 'Integration task',
        description: 'created for the integration test',
        status_id: taskStatusId,
        created_by: ownerId,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    // The create tests insert extra tasks owned by `ownerId`; clean them all up
    // (and their assignments) regardless of their generated ids.
    const owned = await prisma.task.findMany({
      where: { created_by: ownerId },
      select: { id: true },
    });
    await prisma.task_assignment.deleteMany({
      where: { task_id: { in: owned.map((t) => t.id) } },
    });
    await prisma.task.deleteMany({ where: { created_by: ownerId } });
    await prisma.app_user.deleteMany({
      where: { id: { in: [ownerId, otherUserId] } },
    });
    await prisma.task_status.deleteMany({ where: { id: taskStatusId } });
    await prisma.assignment_status.deleteMany({
      where: { id: assignmentStatusId },
    });
    await prisma.user_role.deleteMany({ where: { id: userRoleId } });
    await prisma.$disconnect();
  });

  it('reads the owner and falls back to the owner as assignee when unassigned', async () => {
    const task = await repository.findById(taskId.toString());

    expect(task).not.toBeNull();
    expect(task!.ownerId).toBe(ownerId.toString());
    expect(task!.assigneeId).toBe(ownerId.toString());
  });

  it('persists a reassignment and reads the new assignee back', async () => {
    const task = await repository.findById(taskId.toString());
    task!.reassignTo(otherUserId.toString());
    await repository.save(task!);

    const reloaded = await repository.findById(taskId.toString());
    expect(reloaded!.assigneeId).toBe(otherUserId.toString());
  });

  it('updates the current assignment in place instead of appending history', async () => {
    const task = await repository.findById(taskId.toString());
    task!.reassignTo(ownerId.toString());
    await repository.save(task!);

    const rows = await prisma.task_assignment.findMany({
      where: { task_id: taskId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id.toString()).toBe(ownerId.toString());
  });

  it('creates a task assigned to another user', async () => {
    const task = Task.create({
      ownerId: ownerId.toString(),
      title: 'Created and assigned',
      description: 'assigned to another user',
      assigneeId: otherUserId.toString(),
    });
    await repository.save(task);

    expect(task.id).not.toBeNull();
    const reloaded = await repository.findById(task.id!);
    expect(reloaded!.ownerId).toBe(ownerId.toString());
    expect(reloaded!.assigneeId).toBe(otherUserId.toString());
  });

  it('creates an unassigned task with no assignment row and reads back the owner', async () => {
    const task = Task.create({
      ownerId: ownerId.toString(),
      title: 'Created unassigned',
      description: 'no assignee',
      assigneeId: null,
    });
    await repository.save(task);

    const assignments = await prisma.task_assignment.findMany({
      where: { task_id: BigInt(task.id!) },
    });
    expect(assignments).toHaveLength(0);

    // With no assignment, the read model falls back to the owner.
    const reloaded = await repository.findById(task.id!);
    expect(reloaded!.assigneeId).toBe(ownerId.toString());
  });
});
