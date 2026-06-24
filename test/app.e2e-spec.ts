import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * End-to-end tests against the REAL database (the disposable Supabase dev DB).
 * They exercise the full stack: HTTP → ValidationPipe → @CurrentActor headers →
 * use case → Prisma → Postgres. Every row created here is cleaned up afterwards.
 */
describe('App (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Users we create through the API; tracked so we can remove them afterwards.
  let ownerId: string;
  let otherId: string;
  let adminId: string;

  // Lookup rows we may have to seed, and tasks we create — all cleaned up.
  let seededTaskStatusId: bigint | null = null;
  let seededAssignmentStatusId: bigint | null = null;
  const createdTaskIds: bigint[] = [];

  const actor = (id: string, role: string) => ({
    'x-user-id': id,
    'x-user-role': role,
  });

  const createUser = async (name: string, role: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name, role, password: 'secret-password' })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // The Task aggregate does not model statuses; ensure at least one lookup row
    // of each exists so task creation can resolve its defaults.
    if (!(await prisma.task_status.findFirst())) {
      const status = await prisma.task_status.create({
        data: { description: 'E2E-TODO' },
      });
      seededTaskStatusId = status.id;
    }
    if (!(await prisma.assignment_status.findFirst())) {
      const status = await prisma.assignment_status.create({
        data: { description: 'E2E-ASSIGNED' },
      });
      seededAssignmentStatusId = status.id;
    }

    ownerId = await createUser('E2E Owner', 'USER');
    otherId = await createUser('E2E Other', 'USER');
    adminId = await createUser('E2E Admin', 'ADMIN');
  });

  afterAll(async () => {
    if (createdTaskIds.length > 0) {
      await prisma.task_assignment.deleteMany({
        where: { task_id: { in: createdTaskIds } },
      });
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }
    const userIds = [ownerId, otherId, adminId]
      .filter(Boolean)
      .map((id) => BigInt(id));
    if (userIds.length > 0) {
      await prisma.app_user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (seededTaskStatusId) {
      await prisma.task_status.deleteMany({
        where: { id: seededTaskStatusId },
      });
    }
    if (seededAssignmentStatusId) {
      await prisma.assignment_status.deleteMany({
        where: { id: seededAssignmentStatusId },
      });
    }
    await app.close();
  });

  // Captures a created task id for cleanup and returns the response body.
  const recordTask = (body: {
    id: string;
    ownerId: string;
    assigneeId: string | null;
  }) => {
    createdTaskIds.push(BigInt(body.id));
    return body;
  };

  it('GET / returns the health string', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('task creation', () => {
    it('lets a user create a task for themselves and read it back', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(actor(ownerId, 'USER'))
        .send({ title: 'E2E task', description: 'created over HTTP' })
        .expect(201);

      const body = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      );
      expect(body.ownerId).toBe(ownerId);
      expect(body.assigneeId).toBe(ownerId);

      await request(app.getHttpServer())
        .get(`/tasks/${body.id}`)
        .set(actor(ownerId, 'USER'))
        .expect(200)
        .expect({ id: body.id, ownerId, assigneeId: ownerId });
    });

    it('lets an admin create a task assigned to another user', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(actor(adminId, 'ADMIN'))
        .send({
          title: 'Assigned by admin',
          description: 'for another user',
          assigneeId: otherId,
        })
        .expect(201);

      const body = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      );
      expect(body.ownerId).toBe(adminId);
      expect(body.assigneeId).toBe(otherId);
    });

    it('forbids a user from assigning a task to another user (403)', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set(actor(ownerId, 'USER'))
        .send({
          title: 'Should be denied',
          description: 'user assigning to other',
          assigneeId: otherId,
        })
        .expect(403);
    });

    it('rejects a task with a missing title (400)', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set(actor(ownerId, 'USER'))
        .send({ description: 'no title' })
        .expect(400);
    });
  });

  describe('reading a task', () => {
    it('returns 404 for a task that does not exist', () => {
      return request(app.getHttpServer())
        .get('/tasks/999999999999999')
        .set(actor(ownerId, 'USER'))
        .expect(404);
    });
  });

  describe('reassignment', () => {
    const createOwnedTask = async (title: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(actor(ownerId, 'USER'))
        .send({ title, description: 'for reassignment' })
        .expect(201);
      const body = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      );
      return body.id;
    };

    it('lets the owner reassign their task and reflects it on read', async () => {
      const taskId = await createOwnedTask('Owner reassigns');

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assignee`)
        .set(actor(ownerId, 'USER'))
        .send({ newAssigneeId: otherId })
        .expect(204);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(actor(ownerId, 'USER'))
        .expect(200)
        .expect({ id: taskId, ownerId, assigneeId: otherId });
    });

    it('forbids a non-owner from reassigning a task (403)', async () => {
      const taskId = await createOwnedTask('Owner only');

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assignee`)
        .set(actor(otherId, 'USER'))
        .send({ newAssigneeId: adminId })
        .expect(403);
    });
  });
});
