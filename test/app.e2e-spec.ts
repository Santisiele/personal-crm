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
  let seededCompanyStatusId: bigint | null = null;
  let seededActivityStatusId: bigint | null = null;
  let seededActionTypeId: bigint | null = null;
  const createdTaskIds: bigint[] = [];
  const createdUserIds: string[] = [];
  const createdContactIds: bigint[] = [];
  const createdCompanyIds: bigint[] = [];

  const actor = (id: string, role: string) => ({
    'x-user-id': id,
    'x-user-role': role,
  });

  const createUser = async (name: string, role: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name, role, password: 'secret-password' })
      .expect(201);
    const id = (res.body as { id: string }).id;
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

    ownerId = await createUser('E2E Owner', 'USER');
    otherId = await createUser('E2E Other', 'USER');
    adminId = await createUser('E2E Admin', 'ADMIN');
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

  describe('archiving', () => {
    const createOwnedTask = async (title: string): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/tasks')
        .set(actor(ownerId, 'USER'))
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
        .set(actor(ownerId, 'USER'))
        .send({ reason: 'No longer needed' })
        .expect(204);

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(actor(ownerId, 'USER'))
        .expect(404);
    });

    it('forbids a non-owner from archiving a task (403)', async () => {
      const taskId = await createOwnedTask('Owner only');

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/archive`)
        .set(actor(otherId, 'USER'))
        .send({ reason: 'sneaky' })
        .expect(403);
    });
  });

  describe('user management', () => {
    it('lets a user change their own password (204)', async () => {
      const userId = await createUser('E2E Pwd', 'USER');
      const before = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
      });

      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set(actor(userId, 'USER'))
        .send({ newPassword: 'a-brand-new-password' })
        .expect(204);

      const after = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
      });
      expect(after.user_password_hash).not.toBe(before.user_password_hash);
    });

    it("changes a user's role (204)", async () => {
      const userId = await createUser('E2E Promote', 'USER');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/role`)
        .send({ role: 'ADMIN' })
        .expect(204);

      const updated = await prisma.app_user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
        include: { user_role: true },
      });
      expect(updated.user_role.description).toBe('ADMIN');
    });
  });

  describe('contacts and companies', () => {
    const createContact = async (): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/contacts')
        .send({ contactName: 'E2E Contact', email: 'e2e@example.com' })
        .expect(201);
      const id = (res.body as { id: string }).id;
      createdContactIds.push(BigInt(id));
      return id;
    };

    const createCompany = async (): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/companies')
        .set(actor(adminId, 'ADMIN'))
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
        .set(actor(ownerId, 'USER'))
        .send({ companyName: 'Denied Co' })
        .expect(403);
    });

    it('links a contact to a company (admin) and forbids a user (403)', async () => {
      const companyId = await createCompany();
      const contactId = await createContact();

      const res = await request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set(actor(adminId, 'ADMIN'))
        .send({ contactId, roleInCompany: 'CEO', phone: '555-0100' })
        .expect(201);
      const body = res.body as { companyId: string; contactId: string };
      expect(body.companyId).toBe(companyId);
      expect(body.contactId).toBe(contactId);

      await request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set(actor(ownerId, 'USER'))
        .send({ contactId })
        .expect(403);
    });

    it('returns 404 when linking to a company that does not exist', async () => {
      const contactId = await createContact();
      await request(app.getHttpServer())
        .post('/companies/999999999999999/contacts')
        .set(actor(adminId, 'ADMIN'))
        .send({ contactId })
        .expect(404);
    });
  });
});
