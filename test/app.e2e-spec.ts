import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { seedUserWithRole } from './helpers/seed-user';

/**
 * End-to-end tests against the REAL database (the disposable Supabase dev DB).
 * They exercise the full stack: HTTP → JWT guard → ValidationPipe →
 * @CurrentActor → use case → Prisma → Postgres. Users authenticate via
 * POST /auth/login and send a Bearer token. Every row created is cleaned up.
 */
// Unique suffix per run so login-by-name always resolves to this run's users,
// even if a previous failed run left stale 'E2E *' rows behind.
const RUN = Date.now();

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Users we create through the API; tracked so we can remove them afterwards.
  let ownerId: string;
  let otherId: string;
  let adminId: string;
  // JWTs obtained by logging each user in (auth is now real).
  let ownerToken: string;
  let otherToken: string;
  let adminToken: string;
  let creatorToken: string;

  // Lookup rows we may have to seed, and tasks we create — all cleaned up.
  let seededTaskStatusId: bigint | null = null;
  let seededAssignmentStatusId: bigint | null = null;
  let seededCompanyStatusId: bigint | null = null;
  let seededActivityStatusId: bigint | null = null;
  let seededActionTypeId: bigint | null = null;
  let seededCallTypeId: bigint | null = null;
  let seededDoneStatusId: bigint | null = null;
  const createdTaskIds: bigint[] = [];
  const createdUserIds: string[] = [];
  const createdContactIds: bigint[] = [];
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
    if (!(await prisma.company_status.findFirst())) {
      const status = await prisma.company_status.create({
        data: { description: 'E2E-ACTIVE' },
      });
      seededCompanyStatusId = status.id;
    }
    // Archiving records a task_activity whose status marks it deleted; ensure the
    // lookup rows the adapter resolves by description exist.
    if (
      !(await prisma.activity_status.findFirst({
        where: { description: 'DELETED' },
      }))
    ) {
      const status = await prisma.activity_status.create({
        data: { description: 'DELETED' },
      });
      seededActivityStatusId = status.id;
    }
    if (
      !(await prisma.action_type.findFirst({
        where: { description: 'ARCHIVE' },
      }))
    ) {
      const type = await prisma.action_type.create({
        data: { description: 'ARCHIVE' },
      });
      seededActionTypeId = type.id;
    }
    // Lookups for the task-activity follow-up test.
    if (
      !(await prisma.action_type.findFirst({ where: { description: 'CALL' } }))
    ) {
      const type = await prisma.action_type.create({
        data: { description: 'CALL' },
      });
      seededCallTypeId = type.id;
    }
    if (
      !(await prisma.activity_status.findFirst({
        where: { description: 'DONE' },
      }))
    ) {
      const status = await prisma.activity_status.create({
        data: { description: 'DONE' },
      });
      seededDoneStatusId = status.id;
    }

    ownerId = await createUser(`E2E Owner ${RUN}`, 'USER');
    otherId = await createUser(`E2E Other ${RUN}`, 'USER');
    adminId = await createUser(`E2E Admin ${RUN}`, 'ADMIN');
    await createUser(`E2E Creator ${RUN}`, 'CREATOR');
    ownerToken = await login(`E2E Owner ${RUN}`);
    otherToken = await login(`E2E Other ${RUN}`);
    adminToken = await login(`E2E Admin ${RUN}`);
    creatorToken = await login(`E2E Creator ${RUN}`);
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
    if (createdContactIds.length > 0) {
      await prisma.contact.deleteMany({
        where: { id: { in: createdContactIds } },
      });
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
    if (seededActivityStatusId) {
      await prisma.activity_status.deleteMany({
        where: { id: seededActivityStatusId },
      });
    }
    if (seededActionTypeId) {
      await prisma.action_type.deleteMany({
        where: { id: seededActionTypeId },
      });
    }
    if (seededCallTypeId) {
      await prisma.action_type.deleteMany({ where: { id: seededCallTypeId } });
    }
    if (seededDoneStatusId) {
      await prisma.activity_status.deleteMany({
        where: { id: seededDoneStatusId },
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
        .set(bearer(ownerToken))
        .send({ title: 'E2E task', description: 'created over HTTP' })
        .expect(201);

      const body = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      );
      expect(body.ownerId).toBe(ownerId);
      expect(body.assigneeId).toBe(ownerId);

      await request(app.getHttpServer())
        .get(`/tasks/${body.id}`)
        .set(bearer(ownerToken))
        .expect(200)
        .expect({
          id: body.id,
          ownerId,
          assigneeId: ownerId,
          title: 'E2E task',
          description: 'created over HTTP',
          dueDate: null,
          companyId: null,
          contactId: null,
          status: 'PENDING',
        });
    });

    it('lets an admin create a task assigned to another user', async () => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(adminToken))
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
        .set(bearer(ownerToken))
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
        .set(bearer(ownerToken))
        .send({ description: 'no title' })
        .expect(400);
    });
  });

  describe('reading a task', () => {
    it('returns 404 for a task that does not exist', () => {
      return request(app.getHttpServer())
        .get('/tasks/999999999999999')
        .set(bearer(ownerToken))
        .expect(404);
    });
  });

  describe('reassignment', () => {
    const createOwnedTask = async (title: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
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
        .set(bearer(ownerToken))
        .send({ newAssigneeId: otherId })
        .expect(204);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(bearer(ownerToken))
        .expect(200)
        .expect({
          id: taskId,
          ownerId,
          assigneeId: otherId,
          title: 'Owner reassigns',
          description: 'for reassignment',
          dueDate: null,
          companyId: null,
          contactId: null,
          status: 'PENDING',
        });
    });

    it('forbids a non-owner from reassigning a task (403)', async () => {
      const taskId = await createOwnedTask('Owner only');

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assignee`)
        .set(bearer(otherToken))
        .send({ newAssigneeId: adminId })
        .expect(403);
    });

    it('lets an admin reassign a task held by a plain user (204)', async () => {
      // The task is owned by (and assigned to) a plain USER; an ADMIN outranks
      // the assignee, so it may reassign it even without owning it.
      const taskId = await createOwnedTask('Admin reassigns junior task');

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assignee`)
        .set(bearer(adminToken))
        .send({ newAssigneeId: otherId })
        .expect(204);
    });
  });

  describe('archiving', () => {
    const createOwnedTask = async (title: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title, description: 'to be archived' })
        .expect(201);
      return recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      ).id;
    };

    it('lets the owner archive their task; it is then no longer found (404)', async () => {
      const taskId = await createOwnedTask('Archive me');

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/archive`)
        .set(bearer(ownerToken))
        .send({ reason: 'No longer needed' })
        .expect(204);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(bearer(ownerToken))
        .expect(404);
    });

    it('forbids a non-owner from archiving a task (403)', async () => {
      const taskId = await createOwnedTask('Owner only');

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/archive`)
        .set(bearer(otherToken))
        .send({ reason: 'sneaky' })
        .expect(403);
    });
  });

  describe('user management', () => {
    it('lets any authenticated user list assignable users (id + name)', async () => {
      // A plain user cannot list the full directory but can list assignees.
      const res = await request(app.getHttpServer())
        .get('/users/assignable')
        .set(bearer(ownerToken))
        .expect(200);
      const body = res.body as Array<Record<string, unknown>>;
      expect(body.length).toBeGreaterThan(0);
      for (const entry of body) {
        expect(Object.keys(entry).sort()).toEqual(['id', 'name']);
      }
    });

    it('lets a privileged user create a plain USER (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set(bearer(creatorToken))
        .send({ name: `E2E Create ${RUN}`, password: 'secret-password' })
        .expect(201);
      const body = res.body as { id: string; name: string; role: string };
      createdUserIds.push(body.id);
      expect(body.role).toBe('USER');
    });

    it('forbids anonymous user creation (401)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: `E2E Anon ${RUN}`, password: 'secret-password' })
        .expect(401);
    });

    it('forbids a plain user from creating a user (403)', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(bearer(ownerToken))
        .send({ name: `E2E Denied ${RUN}`, password: 'secret-password' })
        .expect(403);
    });

    it('rejects a role supplied at creation (400)', async () => {
      // Creation carries no role; forbidNonWhitelisted turns the smuggled field
      // into a 400 rather than a silent privilege grant.
      await request(app.getHttpServer())
        .post('/users')
        .set(bearer(creatorToken))
        .send({
          name: `E2E No Escalate ${RUN}`,
          password: 'secret-password',
          role: 'CREATOR',
        })
        .expect(400);
    });

    it('lets a user change their own password (204)', async () => {
      const userId = await createUser(`E2E Pwd ${RUN}`, 'USER');
      const token = await login(`E2E Pwd ${RUN}`);
      const before = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
      });

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set(bearer(token))
        .send({ newPassword: 'a-brand-new-password' })
        .expect(204);

      const after = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
      });
      expect(after.user_password_hash).not.toBe(before.user_password_hash);
    });

    it("lets a creator change a user's role (204)", async () => {
      const userId = await createUser(`E2E Promote ${RUN}`, 'USER');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set(bearer(creatorToken))
        .send({ role: 'ADMIN' })
        .expect(204);

      const updated = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
        include: { user_role: true },
      });
      expect(updated.user_role.description).toBe('ADMIN');
    });

    it('lets an admin promote a user to admin (204)', async () => {
      // An ADMIN manages the ordinary team (USER <-> ADMIN).
      const userId = await createUser(`E2E Admin Promote ${RUN}`, 'USER');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set(bearer(adminToken))
        .send({ role: 'ADMIN' })
        .expect(204);

      const updated = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
        include: { user_role: true },
      });
      expect(updated.user_role.description).toBe('ADMIN');
    });

    it('forbids an admin from granting the creator role (403)', async () => {
      const userId = await createUser(`E2E Admin NoCreator ${RUN}`, 'USER');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .set(bearer(adminToken))
        .send({ role: 'CREATOR' })
        .expect(403);
    });

    it('forbids an admin from demoting a creator (403)', async () => {
      const creatorId = await createUser(`E2E Admin NoTouch ${RUN}`, 'CREATOR');

      await request(app.getHttpServer())
        .patch(`/users/${creatorId}/role`)
        .set(bearer(adminToken))
        .send({ role: 'USER' })
        .expect(403);
    });

    it('rejects creating a user whose name is already taken (409)', async () => {
      const name = `E2E Dup ${RUN}`;
      await createUser(name, 'USER');

      await request(app.getHttpServer())
        .post('/users')
        .set(bearer(creatorToken))
        .send({ name, password: 'secret-password' })
        .expect(409);
    });

    it("reuses a deactivated user's name for a new account (201)", async () => {
      const name = `E2E Reuse ${RUN}`;
      const oldId = await createUser(name, 'USER');

      // Deactivate (logical delete): the name frees up under the partial index.
      await request(app.getHttpServer())
        .delete(`/users/${oldId}`)
        .set(bearer(creatorToken))
        .expect(204);

      const res = await request(app.getHttpServer())
        .post('/users')
        .set(bearer(creatorToken))
        .send({ name, password: 'secret-password' })
        .expect(201);
      const body = res.body as { id: string; name: string };
      createdUserIds.push(body.id);
      expect(body.name).toBe(name);
      expect(body.id).not.toBe(oldId);
    });
  });

  describe('contacts and companies', () => {
    const createContact = async (): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/contacts')
        .set(bearer(ownerToken))
        .send({ contactName: 'E2E Contact', email: 'e2e@example.com' })
        .expect(201);
      const id = (res.body as { id: string }).id;
      createdContactIds.push(BigInt(id));
      return id;
    };

    const createCompany = async (): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/companies')
        .set(bearer(adminToken))
        .send({ companyName: 'E2E Company', cuit: '30-12345678-9' })
        .expect(201);
      const body = res.body as { id: string; ownerId: string };
      createdCompanyIds.push(BigInt(body.id));
      return body.id;
    };

    it('creates a contact over HTTP', async () => {
      const id = await createContact();
      expect(id).toBeTruthy();
    });

    it('lets an admin create a company but forbids a normal user (403)', async () => {
      const companyId = await createCompany();
      expect(companyId).toBeTruthy();

      await request(app.getHttpServer())
        .post('/companies')
        .set(bearer(ownerToken))
        .send({ companyName: 'Denied Co' })
        .expect(403);
    });

    it('links a contact to a company (admin) and forbids a user (403)', async () => {
      const companyId = await createCompany();
      const contactId = await createContact();

      const res = await request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set(bearer(adminToken))
        .send({ contactId, roleInCompany: 'CEO', phone: '555-0100' })
        .expect(201);
      const body = res.body as { companyId: string; contactId: string };
      expect(body.companyId).toBe(companyId);
      expect(body.contactId).toBe(contactId);

      await request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set(bearer(ownerToken))
        .send({ contactId })
        .expect(403);
    });

    it('returns 404 when linking to a company that does not exist', async () => {
      const contactId = await createContact();
      await request(app.getHttpServer())
        .post('/companies/999999999999999/contacts')
        .set(bearer(adminToken))
        .send({ contactId })
        .expect(404);
    });

    it('surfaces a task on the follow-up board with its company and next step', async () => {
      const companyId = await createCompany();
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({
          title: 'Follow up call',
          description: 'x',
          companyId,
          dueDate: '2026-09-01',
        })
        .expect(201);
      const taskId = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      ).id;

      const res = await request(app.getHttpServer())
        .get('/follow-ups')
        .set(bearer(ownerToken))
        .expect(200);
      const rows = res.body as Array<{
        taskId: string;
        nextAction: string;
        nextActionDate: string | null;
      }>;
      const row = rows.find((r) => r.taskId === taskId);
      expect(row).toBeDefined();
      // No activity yet, so the next step falls back to the task title and due date.
      expect(row!.nextAction).toBe('Follow up call');
      expect(row!.nextActionDate).toBe('2026-09-01');
    });

    it('creates a task about a company and contact, and re-links it on edit', async () => {
      const companyId = await createCompany();
      const contactId = await createContact();

      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({
          title: 'Call the company',
          description: 'x',
          companyId,
          contactId,
        })
        .expect(201);
      const taskId = recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      ).id;
      expect((created.body as { companyId: string }).companyId).toBe(companyId);
      expect((created.body as { contactId: string }).contactId).toBe(contactId);

      // Editing clears the contact and keeps the company.
      const edited = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set(bearer(ownerToken))
        .send({ contactId: null })
        .expect(200);
      expect((edited.body as { companyId: string }).companyId).toBe(companyId);
      expect(
        (edited.body as { contactId: string | null }).contactId,
      ).toBeNull();
    });
  });

  describe('authentication', () => {
    it('issues a token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ name: `E2E Owner ${RUN}`, password: 'secret-password' })
        .expect(200);
      expect((res.body as { accessToken: string }).accessToken).toBeTruthy();
    });

    it('rejects invalid credentials (401)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ name: `E2E Owner ${RUN}`, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects a protected route without a token (401)', () => {
      return request(app.getHttpServer()).get('/tasks/1').expect(401);
    });
  });

  describe('task activities', () => {
    const createOwnedTask = async (title: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(bearer(ownerToken))
        .send({ title, description: 'has follow-up' })
        .expect(201);
      return recordTask(
        created.body as { id: string; ownerId: string; assigneeId: string },
      ).id;
    };

    it('lets a task owner log a follow-up activity (201)', async () => {
      const taskId = await createOwnedTask('With activity');

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/activities`)
        .set(bearer(ownerToken))
        .send({
          actionType: 'CALL',
          status: 'DONE',
          activityDate: '2026-06-24',
          description: 'Called the client',
          nextAction: 'Send proposal',
          nextActionDate: '2026-06-30',
        })
        .expect(201);
      const body = res.body as { id: string; taskId: string };
      expect(body.id).toBeTruthy();
      expect(body.taskId).toBe(taskId);
    });

    it('forbids logging on a task you cannot view (403)', async () => {
      const taskId = await createOwnedTask('Owner only');

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/activities`)
        .set(bearer(otherToken))
        .send({
          actionType: 'CALL',
          status: 'DONE',
          activityDate: '2026-06-24',
        })
        .expect(403);
    });

    it('lets a task owner read the activity log most-recent first (200)', async () => {
      const taskId = await createOwnedTask('With a log');

      for (const activityDate of ['2026-01-01', '2026-02-01']) {
        await request(app.getHttpServer())
          .post(`/tasks/${taskId}/activities`)
          .set(bearer(ownerToken))
          .send({ actionType: 'CALL', status: 'DONE', activityDate })
          .expect(201);
      }

      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/activities`)
        .set(bearer(ownerToken))
        .expect(200);
      const body = res.body as Array<{ taskId: string; activityDate: string }>;
      expect(body).toHaveLength(2);
      expect(body[0].activityDate).toBe('2026-02-01');
      expect(body[1].activityDate).toBe('2026-01-01');
      expect(body.every((a) => a.taskId === taskId)).toBe(true);
    });

    it('forbids reading the log of a task you cannot view (403)', async () => {
      const taskId = await createOwnedTask('Owner only log');

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}/activities`)
        .set(bearer(otherToken))
        .expect(403);
    });

    it('exposes the author and description on a logged activity', async () => {
      const taskId = await createOwnedTask('Detailed activity');
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/activities`)
        .set(bearer(ownerToken))
        .send({
          actionType: 'CALL',
          status: 'DONE',
          activityDate: '2026-05-05',
          description: 'Spoke with the client',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/activities`)
        .set(bearer(ownerToken))
        .expect(200);
      const first = (res.body as Array<Record<string, unknown>>)[0];
      expect(first.authorId).toBe(ownerId);
      expect(first.description).toBe('Spoke with the client');
    });

    it('lets a privileged actor read the global activity feed (200)', async () => {
      const taskId = await createOwnedTask('Feed task');
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/activities`)
        .set(bearer(ownerToken))
        .send({
          actionType: 'NOTE',
          status: 'DONE',
          activityDate: '2026-05-06',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/activities')
        .set(bearer(adminToken))
        .expect(200);
      const feed = res.body as Array<{ taskId: string }>;
      expect(feed.some((a) => a.taskId === taskId)).toBe(true);
    });

    it('forbids a plain user from the global activity feed (403)', () => {
      return request(app.getHttpServer())
        .get('/activities')
        .set(bearer(ownerToken))
        .expect(403);
    });
  });
});
