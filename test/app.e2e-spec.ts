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

  // Rows we create and must remove from the shared dev DB afterwards.
  let userId: string;
  let seededTaskStatusId: bigint | null = null;
  let seededAssignmentStatusId: bigint | null = null;
  const createdTaskIds: bigint[] = [];

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

    // Create the acting user through the real HTTP API.
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'E2E Actor', role: 'USER', password: 'secret-password' })
      .expect(201);
    userId = (res.body as { id: string }).id;
  });

  afterAll(async () => {
    if (createdTaskIds.length > 0) {
      await prisma.task_assignment.deleteMany({
        where: { task_id: { in: createdTaskIds } },
      });
      await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    }
    if (userId) {
      await prisma.app_user.deleteMany({ where: { id: BigInt(userId) } });
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

  it('GET / returns the health string', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('creates a task for the acting user and reads it back', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set('x-user-id', userId)
      .set('x-user-role', 'USER')
      .send({ title: 'E2E task', description: 'created over HTTP' })
      .expect(201);

    const body = created.body as {
      id: string;
      ownerId: string;
      assigneeId: string;
    };
    expect(body.ownerId).toBe(userId);
    expect(body.assigneeId).toBe(userId);
    createdTaskIds.push(BigInt(body.id));

    await request(app.getHttpServer())
      .get(`/tasks/${body.id}`)
      .set('x-user-id', userId)
      .set('x-user-role', 'USER')
      .expect(200)
      .expect({ id: body.id, ownerId: userId, assigneeId: userId });
  });
});
