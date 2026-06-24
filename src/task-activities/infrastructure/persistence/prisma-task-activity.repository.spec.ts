import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { PrismaTaskActivityRepository } from '@/task-activities/infrastructure/persistence/prisma-task-activity.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaTaskActivityRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaTaskActivityRepository;

  let userRoleId: bigint;
  let taskStatusId: bigint;
  let activityStatusId: bigint;
  let actionTypeId: bigint;
  let authorId: bigint;
  let taskId: bigint;

  const STATUS = 'IT-ACTIVITY-STATUS';
  const ACTION_TYPE = 'IT-ACTION-TYPE';

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaTaskActivityRepository(prisma);

    // The schema is heavily normalized; create the lookup/FK rows the adapter
    // and the activity row depend on.
    const role = await prisma.user_role.create({
      data: { description: 'IT-ACTIVITY-ROLE' },
    });
    userRoleId = role.id;

    const author = await prisma.app_user.create({
      data: {
        name: 'Activity Author',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    authorId = author.id;

    const taskStatus = await prisma.task_status.create({
      data: { description: 'IT-ACTIVITY-TASK-STATUS' },
    });
    taskStatusId = taskStatus.id;

    const task = await prisma.task.create({
      data: {
        title: 'Integration task',
        description: 'created for the activity integration test',
        status_id: taskStatusId,
        created_by: authorId,
      },
    });
    taskId = task.id;

    const activityStatus = await prisma.activity_status.create({
      data: { description: STATUS },
    });
    activityStatusId = activityStatus.id;

    const actionType = await prisma.action_type.create({
      data: { description: ACTION_TYPE },
    });
    actionTypeId = actionType.id;
  });

  afterAll(async () => {
    await prisma.task_activity.deleteMany({ where: { task_id: taskId } });
    await prisma.task.deleteMany({ where: { id: taskId } });
    await prisma.app_user.deleteMany({ where: { id: authorId } });
    await prisma.task_status.deleteMany({ where: { id: taskStatusId } });
    await prisma.activity_status.deleteMany({
      where: { id: activityStatusId },
    });
    await prisma.action_type.deleteMany({ where: { id: actionTypeId } });
    await prisma.user_role.deleteMany({ where: { id: userRoleId } });
    await prisma.$disconnect();
  });

  it('inserts a task_activity row resolving the lookups by description', async () => {
    const activity = TaskActivity.create({
      taskId: taskId.toString(),
      authorId: authorId.toString(),
      actionType: ACTION_TYPE,
      status: STATUS,
      activityDate: '2026-06-24',
      description: 'Called the customer',
      nextAction: 'Send the quote',
      nextActionDate: '2026-06-30',
    });

    await repository.save(activity);

    expect(activity.id).not.toBeNull();
    const row = await prisma.task_activity.findUnique({
      where: { id: BigInt(activity.id!) },
    });
    expect(row).not.toBeNull();
    expect(row!.task_id.toString()).toBe(taskId.toString());
    expect(row!.user_id.toString()).toBe(authorId.toString());
    expect(row!.created_by.toString()).toBe(authorId.toString());
    expect(row!.status_id.toString()).toBe(activityStatusId.toString());
    expect(row!.action_type_id.toString()).toBe(actionTypeId.toString());
    expect(row!.description).toBe('Called the customer');
    expect(row!.next_action).toBe('Send the quote');
    expect(row!.next_action_date).not.toBeNull();
  });
});
