import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { seedUserWithRole } from './helpers/seed-user';

/**
 * End-to-end tests for the extended tasks features (due date, company link,
 * status flow and listing) against the REAL disposable dev DB. The full stack is
 * exercised: HTTP -> JWT guard -> ValidationPipe -> @CurrentActor -> use case ->
 * Prisma -> Postgres. Users authenticate via POST /auth/login and send a Bearer
 * token. Every row created is cleaned up. A unique suffix per run keeps
 * login-by-name unambiguous and avoids colliding with other e2e specs.
 *
 * NOTE: this file is written but NOT run here; the orchestrator runs the full
 * e2e suite once at integration (the dev DB is shared and would collide).
 */
const RUN = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe('Tasks features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let otherId: string;
  let ownerToken: string;
  let otherToken: string;
  let adminToken: string;

  // Status lookup rows we seed by description so the adapter can resolve them.
  const seededTaskStatusIds: bigint[] = [];
  let seededAssignmentStatusId: bigint | null = null;
  let seededCompanyStatusId: bigint | null = null;
  let seededDeletedStatusId: bigint | null = null;
  let seededArchiveTypeId: bigint | null = null;
  let companyId: string;
  const createdTaskIds: bigint[] = [];
  const createdUserIds: string[] = [];
  const createdCompanyIds: bigint[] = [];

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

  type TaskBody = {
    id: string;
    ownerId: string;
    assigneeId: string | null;
    dueDate: string | null;
    companyId: string | null;
    status: string;
  };

  const recordTask = (body: TaskBody): TaskBody => {
    createdTaskIds.push(BigInt(body.id));
    return body;
  };

  const ensureTaskStatus = async (description: string) => {
    if (!(await prisma.task_status.findFirst({ where: { description } }))) {
      const row = await prisma.task_status.create({ data: { description } });
      seededTaskStatusIds.push(row.id);
    }
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // The status flow resolves task_status by description; ensure they exist.
    await ensureTaskStatus('PENDING');
    await ensureTaskStatus('IN_PROGRESS');
    await ensureTaskStatus('DONE');

    if (!(await prisma.assignment_status.findFirst())) {
      const status = await prisma.assignment_status.create({
        data: { description: 'E2E-ASSIGNED' },
      });
      seededAssignmentStatusId = status.id;
    }
    if (!(await prisma.company_status.findFirst())) {
      const status = await prisma.company_status.create({
        data: { description: 'E2E-ACTIVE' },
      });
      seededCompanyStatusId = status.id;
    }
    // Archiving records a task_activity whose status/type are resolved by
    // description; ensure the lookups exist so the archive-then-list test works.
    if (
      !(await prisma.activity_status.findFirst({
        where: { description: 'DELETED' },
      }))
    ) {
      const status = await prisma.activity_status.create({
        data: { description: 'DELETED' },
      });
      seededDeletedStatusId = status.id;
    }
    if (
      !(await prisma.action_type.findFirst({
        where: { description: 'ARCHIVE' },
      }))
    ) {
      const type = await prisma.action_type.create({
        data: { description: 'ARCHIVE' },
      });
      seededArchiveTypeId = type.id;
    }

    await createUser(`E2E-T Owner ${RUN}`, 'USER');
    otherId = await createUser(`E2E-T Other ${RUN}`, 'USER');
    await createUser(`E2E-T Admin ${RUN}`, 'ADMIN');
    ownerToken = await login(`E2E-T Owner ${RUN}`);
    otherToken = await login(`E2E-T Other ${RUN}`);
    adminToken = await login(`E2E-T Admin ${RUN}`);

    const company = await request(app.getHttpServer())
      .post('/companies')
      .set(bearer(adminToken))
      .send({ companyName: `E2E-T Co ${RUN}` })
      .expect(201);
    companyId = (company.body as { id: string }).id;
    createdCompanyIds.push(BigInt(companyId));
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
    if (createdCompanyIds.length > 0) {
      await prisma.contact_x_company.deleteMany({
        where: { company_id: { in: createdCompanyIds } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    if (seededTaskStatusIds.length > 0) {
      await prisma.task_status.deleteMany({
        where: { id: { in: seededTaskStatusIds } },
      });
    }
    if (seededAssignmentStatusId) {
      await prisma.assignment_status.deleteMany({
        where: { id: seededAssignmentStatusId },
      });
    }
    if (seededCompanyStatusId) {
      await prisma.company_status.deleteMany({
        where: { id: seededCompanyStatusId },
      });
    }
    if (seededDeletedStatusId) {
      await prisma.activity_status.deleteMany({
        where: { id: seededDeletedStatusId },
      });
    }
    if (seededArchiveTypeId) {
      await prisma.action_type.deleteMany({
        where: { id: seededArchiveTypeId },
      });
    }
    await app.close();
  });

  describe('due date', () => {
    it('creates a task with a due date and reads it back', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({
          title: 'With due date',
          description: 'has a deadline',
          dueDate: '2026-12-31',
        })
        .expect(201);

      const body = recordTask(created.body as TaskBody);
      expect(body.dueDate).toBe('2026-12-31');

      const fetched = await request(app.getHttpServer())
        .get(`/tasks/${body.id}`)
        .set(bearer(ownerToken))
        .expect(200);
      expect((fetched.body as TaskBody).dueDate).toBe('2026-12-31');
    });

    it('creates a task without a due date (null)', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'No due date', description: 'whenever' })
        .expect(201);
      const body = recordTask(created.body as TaskBody);
      expect(body.dueDate).toBeNull();
    });

    it('rejects an invalid due date (400)', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({
          title: 'Bad date',
          description: 'not iso',
          dueDate: 'not-a-date',
        })
        .expect(400);
    });
  });

  describe('company link', () => {
    it('associates a task with a company and reads it back', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({
          title: 'For a company',
          description: 'linked',
          companyId,
        })
        .expect(201);

      const body = recordTask(created.body as TaskBody);
      expect(body.companyId).toBe(companyId);

      const fetched = await request(app.getHttpServer())
        .get(`/tasks/${body.id}`)
        .set(bearer(ownerToken))
        .expect(200);
      expect((fetched.body as TaskBody).companyId).toBe(companyId);
    });
  });

  describe('status flow', () => {
    const createOwnedTask = async (): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'Status task', description: 'will transition' })
        .expect(201);
      return recordTask(created.body as TaskBody).id;
    };

    it('a new task starts in PENDING', async () => {
      const id = await createOwnedTask();
      const fetched = await request(app.getHttpServer())
        .get(`/tasks/${id}`)
        .set(bearer(ownerToken))
        .expect(200);
      expect((fetched.body as TaskBody).status).toBe('PENDING');
    });

    it('lets the owner transition the status and reflects it on read', async () => {
      const id = await createOwnedTask();

      const patched = await request(app.getHttpServer())
        .patch(`/tasks/${id}/status`)
        .set(bearer(ownerToken))
        .send({ status: 'IN_PROGRESS' })
        .expect(200);
      expect((patched.body as TaskBody).status).toBe('IN_PROGRESS');

      const fetched = await request(app.getHttpServer())
        .get(`/tasks/${id}`)
        .set(bearer(ownerToken))
        .expect(200);
      expect((fetched.body as TaskBody).status).toBe('IN_PROGRESS');
    });

    it('lets the assignee change the status', async () => {
      // Admin creates a task assigned to `other`, who then transitions it.
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(adminToken))
        .send({
          title: 'Assigned task',
          description: 'for the assignee',
          assigneeId: otherId,
        })
        .expect(201);
      const id = recordTask(created.body as TaskBody).id;

      await request(app.getHttpServer())
        .patch(`/tasks/${id}/status`)
        .set(bearer(otherToken))
        .send({ status: 'DONE' })
        .expect(200);
    });

    it('forbids a non-owner non-assignee from changing the status (403)', async () => {
      const id = await createOwnedTask();
      await request(app.getHttpServer())
        .patch(`/tasks/${id}/status`)
        .set(bearer(otherToken))
        .send({ status: 'DONE' })
        .expect(403);
    });

    it('rejects an invalid status value (400)', async () => {
      const id = await createOwnedTask();
      await request(app.getHttpServer())
        .patch(`/tasks/${id}/status`)
        .set(bearer(ownerToken))
        .send({ status: 'NOPE' })
        .expect(400);
    });
  });

  describe('listing', () => {
    it("lists the caller's visible tasks and excludes others'", async () => {
      const mine = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'Mine to list', description: 'owned' })
        .expect(201);
      const mineId = recordTask(mine.body as TaskBody).id;

      const theirs = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(otherToken))
        .send({ title: 'Not mine', description: 'other owns' })
        .expect(201);
      const theirsId = recordTask(theirs.body as TaskBody).id;

      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set(bearer(ownerToken))
        .expect(200);
      const ids = (res.body as TaskBody[]).map((t) => t.id);
      expect(ids).toContain(mineId);
      expect(ids).not.toContain(theirsId);
    });

    it('filters tasks by company', async () => {
      const linked = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'Company listed', description: 'linked', companyId })
        .expect(201);
      const linkedId = recordTask(linked.body as TaskBody).id;

      const unlinked = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'No company listed', description: 'unlinked' })
        .expect(201);
      const unlinkedId = recordTask(unlinked.body as TaskBody).id;

      const res = await request(app.getHttpServer())
        .get('/tasks')
        .query({ companyId })
        .set(bearer(ownerToken))
        .expect(200);
      const ids = (res.body as TaskBody[]).map((t) => t.id);
      expect(ids).toContain(linkedId);
      expect(ids).not.toContain(unlinkedId);
    });

    it('admin sees tasks across users', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set(bearer(adminToken))
        .expect(200);
      // Admin is privileged, so the list is non-empty (we created several).
      expect((res.body as TaskBody[]).length).toBeGreaterThan(0);
    });

    it('excludes archived tasks from the listing', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title: 'To archive', description: 'gone soon' })
        .expect(201);
      const id = recordTask(created.body as TaskBody).id;

      // Archiving records a task_activity; the relevant lookups (DELETED /
      // ARCHIVE) are seeded by the main app.e2e-spec; this assumes they exist.
      await request(app.getHttpServer())
        .post(`/tasks/${id}/archive`)
        .set(bearer(ownerToken))
        .send({ reason: 'no longer needed' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set(bearer(ownerToken))
        .expect(200);
      expect((res.body as TaskBody[]).map((t) => t.id)).not.toContain(id);
    });
  });
});
