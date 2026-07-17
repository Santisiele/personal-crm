import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { seedUserWithRole } from './helpers/seed-user';

/**
 * End-to-end tests for the task-assignments context against the REAL database
 * (the disposable Supabase dev DB). They exercise the full stack: HTTP → JWT
 * guard → ValidationPipe → @CurrentActor → use case → Prisma → Postgres.
 *
 * Covered:
 *  - GET  /tasks/:taskId/assignments        (history, most-recent first, 200)
 *  - GET  history denied to a non-viewer    (403) and missing task (404)
 *  - POST /tasks/:taskId/assignments/:id/accept | reject (assignee only)
 *  - accept/reject denied to a non-assignee (403) and missing assignment (404)
 *
 * Users authenticate via POST /auth/login and send a Bearer token. Every row
 * created is cleaned up. A unique suffix per run keeps login-by-name stable.
 */
const RUN = Date.now();

describe('Task assignments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminId: string;
  let assigneeId: string;
  let adminToken: string;
  let assigneeToken: string;
  let otherToken: string;

  // Lookup rows we may have to seed, and ids we create — all cleaned up.
  let seededTaskStatusId: bigint | null = null;
  const seededAssignmentStatusIds: bigint[] = [];
  const createdTaskIds: bigint[] = [];
  const createdUserIds: string[] = [];

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (name: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name, password: 'secret-password' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  };

  // Fixtures are seeded directly (see seedUserWithRole): public registration
  // now always yields a plain USER, so privileged fixtures cannot go through the
  // API. The seeded row is identical to a registered one, so login still works.
  const createUser = async (name: string, role: string): Promise<string> => {
    const id = await seedUserWithRole(prisma, name, role, 'secret-password');
    createdUserIds.push(id);
    return id;
  };

  // Creates a task (as admin) assigned to a given user, recording it for cleanup.
  const createAssignedTask = async (assignee: string): Promise<string> => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(adminToken))
      .send({
        title: `Assignment E2E ${RUN}`,
        description: 'has an assignment',
        assigneeId: assignee,
      })
      .expect(201);
    const id = (created.body as { id: string }).id;
    createdTaskIds.push(BigInt(id));
    return id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // The Task aggregate does not model statuses; ensure a task_status exists so
    // task creation can resolve its default.
    if (!(await prisma.task_status.findFirst())) {
      const status = await prisma.task_status.create({
        data: { description: 'E2E-TODO' },
      });
      seededTaskStatusId = status.id;
    }
    // The assignment lifecycle statuses are resolved by description; seed the
    // ones the accept/reject flow needs if missing (the adapter falls back to the
    // lowest-id status on create, but accept needs ACCEPTED, reject REJECTED).
    for (const description of ['PENDING', 'ACCEPTED', 'REJECTED']) {
      if (
        !(await prisma.assignment_status.findFirst({ where: { description } }))
      ) {
        const status = await prisma.assignment_status.create({
          data: { description },
        });
        seededAssignmentStatusIds.push(status.id);
      }
    }

    adminId = await createUser(`E2E TA Admin ${RUN}`, 'ADMIN');
    assigneeId = await createUser(`E2E TA Assignee ${RUN}`, 'USER');
    await createUser(`E2E TA Other ${RUN}`, 'USER');
    adminToken = await login(`E2E TA Admin ${RUN}`);
    assigneeToken = await login(`E2E TA Assignee ${RUN}`);
    otherToken = await login(`E2E TA Other ${RUN}`);
  });

  afterAll(async () => {
    if (createdTaskIds.length > 0) {
      await prisma.task_assignment.deleteMany({
        where: { task_id: { in: createdTaskIds } },
      });
      await prisma.task_activity.deleteMany({
        where: { task_id: { in: createdTaskIds } },
      });
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    if (seededTaskStatusId) {
      await prisma.task_status.deleteMany({
        where: { id: seededTaskStatusId },
      });
    }
    if (seededAssignmentStatusIds.length > 0) {
      await prisma.assignment_status.deleteMany({
        where: { id: { in: seededAssignmentStatusIds } },
      });
    }
    await app.close();
  });

  describe('assignment history', () => {
    it("returns a task's assignment history (most-recent first)", async () => {
      const taskId = await createAssignedTask(assigneeId);

      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/assignments`)
        .set(bearer(adminToken))
        .expect(200);

      const history = res.body as Array<{
        id: string;
        taskId: string;
        assigneeId: string;
        assignedById: string;
        status: string;
      }>;
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].taskId).toBe(taskId);
      expect(history[0].assigneeId).toBe(assigneeId);
      expect(history[0].assignedById).toBe(adminId);
    });

    it('forbids viewing the history of a task you cannot view (403)', async () => {
      const taskId = await createAssignedTask(assigneeId);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}/assignments`)
        .set(bearer(otherToken))
        .expect(403);
    });

    it('returns 404 for the history of a task that does not exist', () => {
      return request(app.getHttpServer())
        .get('/tasks/999999999999999/assignments')
        .set(bearer(adminToken))
        .expect(404);
    });
  });

  describe('accepting and rejecting an assignment', () => {
    const currentAssignmentId = async (taskId: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/assignments`)
        .set(bearer(adminToken))
        .expect(200);
      return (res.body as Array<{ id: string }>)[0].id;
    };

    it('lets the assignee accept their assignment (200)', async () => {
      const taskId = await createAssignedTask(assigneeId);
      const assignmentId = await currentAssignmentId(taskId);

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assignments/${assignmentId}/accept`)
        .set(bearer(assigneeToken))
        .expect(200);
      expect((res.body as { status: string }).status).toBe('ACCEPTED');
    });

    it('lets the assignee reject their assignment (200)', async () => {
      const taskId = await createAssignedTask(assigneeId);
      const assignmentId = await currentAssignmentId(taskId);

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assignments/${assignmentId}/reject`)
        .set(bearer(assigneeToken))
        .expect(200);
      expect((res.body as { status: string }).status).toBe('REJECTED');
    });

    it('forbids a non-assignee from accepting (403)', async () => {
      const taskId = await createAssignedTask(assigneeId);
      const assignmentId = await currentAssignmentId(taskId);

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assignments/${assignmentId}/accept`)
        .set(bearer(otherToken))
        .expect(403);
    });

    it('returns 404 when accepting an assignment that does not exist', async () => {
      const taskId = await createAssignedTask(assigneeId);

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assignments/999999999999999/accept`)
        .set(bearer(assigneeToken))
        .expect(404);
    });
  });
});
