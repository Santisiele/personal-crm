import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { seedUserWithRole } from './helpers/seed-user';

/**
 * End-to-end tests for the company status admin surface against the REAL
 * database (the disposable Supabase dev DB). They exercise the full stack: HTTP →
 * JWT guard → ValidationPipe → @CurrentActor → use case → Prisma → Postgres.
 *
 * Only a CREATOR may create or list statuses, so we mint a CREATOR user via the
 * /users endpoint (which accepts any UserRole) and a plain USER for the denial
 * path. Every `company_status` row we create is cleaned up by id in afterAll; we
 * never touch pre-existing rows. A distinct filename avoids colliding with the
 * other agents' e2e suites that share this DB.
 */
const RUN = Date.now();

describe('Company statuses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let creatorToken: string;
  let userToken: string;

  const createdStatusIds: bigint[] = [];
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await createUser(`E2E Status Creator ${RUN}`, 'CREATOR');
    await createUser(`E2E Status User ${RUN}`, 'USER');
    creatorToken = await login(`E2E Status Creator ${RUN}`);
    userToken = await login(`E2E Status User ${RUN}`);
  });

  afterAll(async () => {
    if (createdStatusIds.length > 0) {
      await prisma.company_status.deleteMany({
        where: { id: { in: createdStatusIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    await app.close();
  });

  describe('creating a company status', () => {
    it('lets a creator create a status (201)', async () => {
      const description = `E2E Status ${RUN}`;

      const res = await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);

      const body = res.body as { id: string; description: string };
      expect(body.id).toBeDefined();
      expect(body.description).toBe(description);
      createdStatusIds.push(BigInt(body.id));
    });

    it('forbids a normal user from creating a status (403)', async () => {
      await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(userToken))
        .send({ description: `E2E Status Denied ${RUN}` })
        .expect(403);
    });

    it('rejects a duplicate description (409)', async () => {
      const description = `E2E Status Dup ${RUN}`;

      const res = await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);
      createdStatusIds.push(BigInt((res.body as { id: string }).id));

      await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(409);
    });
  });

  describe('listing the company statuses', () => {
    it('lets a creator list the statuses including the created one (200)', async () => {
      const description = `E2E Status List ${RUN}`;

      const res = await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);
      const id = (res.body as { id: string }).id;
      createdStatusIds.push(BigInt(id));

      const list = await request(app.getHttpServer())
        .get('/company-statuses')
        .set(bearer(creatorToken))
        .expect(200);

      const body = list.body as Array<{ id: string; description: string }>;
      expect(
        body.some((s) => s.id === id && s.description === description),
      ).toBe(true);
    });

    it('forbids a normal user from listing the statuses (403)', async () => {
      await request(app.getHttpServer())
        .get('/company-statuses')
        .set(bearer(userToken))
        .expect(403);
    });
  });

  describe('deleting a company status', () => {
    const createStatus = async (description: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/company-statuses')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);
      const id = (res.body as { id: string }).id;
      createdStatusIds.push(BigInt(id));
      return id;
    };

    it('lets a creator delete a status; it leaves the catalogue (204)', async () => {
      const id = await createStatus(`E2E Status Del ${RUN}`);

      await request(app.getHttpServer())
        .delete(`/company-statuses/${id}`)
        .set(bearer(creatorToken))
        .expect(204);

      const list = await request(app.getHttpServer())
        .get('/company-statuses')
        .set(bearer(creatorToken))
        .expect(200);
      const body = list.body as Array<{ id: string }>;
      expect(body.some((s) => s.id === id)).toBe(false);
    });

    it('forbids a normal user from deleting a status (403)', async () => {
      const id = await createStatus(`E2E Status Del Denied ${RUN}`);

      await request(app.getHttpServer())
        .delete(`/company-statuses/${id}`)
        .set(bearer(userToken))
        .expect(403);
    });

    it('returns 404 deleting a status that does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/company-statuses/999999999999999')
        .set(bearer(creatorToken))
        .expect(404);
    });
  });
});
