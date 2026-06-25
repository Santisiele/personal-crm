import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * End-to-end tests for the role administration surface (POST /roles and
 * GET /roles) against the REAL database (the disposable Supabase dev DB). They
 * exercise the full stack: HTTP → JwtAuthGuard (Bearer) → ValidationPipe →
 * @CurrentActor → use case → Prisma → Postgres.
 *
 * A CREATOR token is minted by registering a user with the CREATOR role through
 * the public POST /users endpoint and logging in — the same mechanism the user
 * directory e2e uses to obtain a privileged (ADMIN) actor.
 *
 * A unique suffix per run keeps the created rows isolated from other runs. Every
 * user and role created here is cleaned up afterwards; the seeded USER/ADMIN/
 * CREATOR role rows are never touched.
 */
const RUN = Date.now();

describe('Role management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let creatorToken: string;
  let userToken: string;
  const createdUserIds: string[] = [];
  const createdRoleIds: string[] = [];

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (name: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name, password: 'secret-password' })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  };

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

    await createUser(`E2E Role Creator ${RUN}`, 'CREATOR');
    await createUser(`E2E Role User ${RUN}`, 'USER');
    creatorToken = await login(`E2E Role Creator ${RUN}`);
    userToken = await login(`E2E Role User ${RUN}`);
  });

  afterAll(async () => {
    // Remove only the role rows this run created; never the seeded
    // USER/ADMIN/CREATOR definitions.
    if (createdRoleIds.length > 0) {
      await prisma.user_role.deleteMany({
        where: { id: { in: createdRoleIds.map((id) => BigInt(id)) } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    await app.close();
  });

  describe('POST /roles', () => {
    it('lets a creator create a role (201)', async () => {
      const description = `E2E_ROLE_${RUN}`;
      const res = await request(app.getHttpServer())
        .post('/roles')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);

      const body = res.body as { id: string; description: string };
      expect(body.description).toBe(description);
      expect(body.id).toBeDefined();
      createdRoleIds.push(body.id);
    });

    it('rejects a duplicate role description (409)', async () => {
      const description = `E2E_ROLE_DUP_${RUN}`;
      const res = await request(app.getHttpServer())
        .post('/roles')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(201);
      createdRoleIds.push((res.body as { id: string }).id);

      await request(app.getHttpServer())
        .post('/roles')
        .set(bearer(creatorToken))
        .send({ description })
        .expect(409);
    });

    it('forbids a non-creator from creating a role (403)', () => {
      return request(app.getHttpServer())
        .post('/roles')
        .set(bearer(userToken))
        .send({ description: `E2E_ROLE_FORBIDDEN_${RUN}` })
        .expect(403);
    });

    it('rejects an empty description (400)', () => {
      return request(app.getHttpServer())
        .post('/roles')
        .set(bearer(creatorToken))
        .send({ description: '' })
        .expect(400);
    });
  });

  describe('GET /roles', () => {
    it('lets a creator list the roles, including the seeded ones', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles')
        .set(bearer(creatorToken))
        .expect(200);

      const body = res.body as Array<{ id: string; description: string }>;
      const descriptions = body.map((role) => role.description);
      expect(descriptions).toEqual(
        expect.arrayContaining(['USER', 'ADMIN', 'CREATOR']),
      );
      for (const role of body) {
        expect(Object.keys(role).sort()).toEqual(['description', 'id']);
      }
    });

    it('forbids a non-creator from listing the roles (403)', () => {
      return request(app.getHttpServer())
        .get('/roles')
        .set(bearer(userToken))
        .expect(403);
    });
  });
});
