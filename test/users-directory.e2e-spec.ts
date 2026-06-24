import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * End-to-end tests for the user directory (GET /users and GET /users/:id)
 * against the REAL database (the disposable Supabase dev DB). They exercise the
 * full stack: HTTP → ValidationPipe → @CurrentActor headers → use case → Prisma
 * → Postgres. Every row created here is cleaned up afterwards.
 *
 * A unique suffix per run keeps the created users isolated from other runs.
 */
const RUN = Date.now();

describe('User directory (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Users we create through the API; tracked so we can remove them afterwards.
  let ownerId: string;
  let otherId: string;
  let adminId: string;
  const createdUserIds: string[] = [];

  // Acts via the current actor header seam (id + role).
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

    ownerId = await createUser(`E2E Dir Owner ${RUN}`, 'USER');
    otherId = await createUser(`E2E Dir Other ${RUN}`, 'USER');
    adminId = await createUser(`E2E Dir Admin ${RUN}`, 'ADMIN');
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    await app.close();
  });

  describe('GET /users', () => {
    it('lets an admin list users and never exposes a password hash', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set(actor(adminId, 'ADMIN'))
        .expect(200);

      const body = res.body as Array<Record<string, unknown>>;
      const ids = body.map((u) => u.id as string);
      expect(ids).toEqual(expect.arrayContaining([ownerId, otherId, adminId]));
      for (const view of body) {
        expect(Object.keys(view).sort()).toEqual(['id', 'name', 'role']);
        expect(view).not.toHaveProperty('passwordHash');
        expect(view).not.toHaveProperty('user_password_hash');
      }
    });

    it('forbids a plain user from listing users (403)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set(actor(ownerId, 'USER'))
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('lets an admin view any user with a hash-free view', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/${otherId}`)
        .set(actor(adminId, 'ADMIN'))
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toEqual({
        id: otherId,
        name: `E2E Dir Other ${RUN}`,
        role: 'USER',
      });
    });

    it('lets a user view their own profile', () => {
      return request(app.getHttpServer())
        .get(`/users/${ownerId}`)
        .set(actor(ownerId, 'USER'))
        .expect(200)
        .expect({
          id: ownerId,
          name: `E2E Dir Owner ${RUN}`,
          role: 'USER',
        });
    });

    it('forbids a user from viewing another user (403)', () => {
      return request(app.getHttpServer())
        .get(`/users/${otherId}`)
        .set(actor(ownerId, 'USER'))
        .expect(403);
    });

    it('returns 404 for a user that does not exist', () => {
      return request(app.getHttpServer())
        .get('/users/999999999999999')
        .set(actor(adminId, 'ADMIN'))
        .expect(404);
    });
  });
});
