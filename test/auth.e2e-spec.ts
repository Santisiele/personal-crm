import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { seedUserWithRole } from './helpers/seed-user';

/**
 * End-to-end tests for the authentication token lifecycle against the REAL
 * database (the disposable Supabase dev DB). Exercises the full stack: login
 * issuing an access + refresh pair, the refresh endpoint, and the JWT guard
 * rejecting expired/invalid tokens (401). Self-cleaning; uses a unique suffix
 * per run so login-by-name resolves to this run's user.
 *
 * A separate filename from app.e2e-spec.ts so concurrent agents never collide.
 */
const RUN = Date.now();
const PASSWORD = 'secret-password';
// Mirror AuthModule's dev fallback so we can forge an already-expired access
// token signed with the same secret the running app verifies against.
const SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret';

describe('Auth token lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const createdUserIds: string[] = [];
  let userId: string;

  const userName = `E2E Auth ${RUN}`;

  // Fixtures are seeded directly (see seedUserWithRole): public registration
  // now always yields a plain USER, so privileged fixtures cannot go through the
  // API. The seeded row is identical to a registered one, so login still works.
  const createUser = async (name: string, role: string): Promise<string> => {
    const id = await seedUserWithRole(prisma, name, role, PASSWORD);
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

    userId = await createUser(userName, 'USER');
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds.map((id) => BigInt(id)) } },
      });
    }
    await app.close();
  });

  it('login issues an access and a refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: userName, password: PASSWORD })
      .expect(200);
    const body = res.body as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.accessToken).not.toBe(body.refreshToken);
  });

  it('the access token authorizes a protected route', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: userName, password: PASSWORD })
      .expect(200);
    const { accessToken } = res.body as { accessToken: string };

    // A non-existent task returns 404 (not 401), proving the token was accepted.
    await request(app.getHttpServer())
      .get('/tasks/999999999999999')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(404);
  });

  it('refresh exchanges a valid refresh token for a fresh access token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: userName, password: PASSWORD })
      .expect(200);
    const { refreshToken } = login.body as { refreshToken: string };

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    const { accessToken } = refreshed.body as { accessToken: string };
    expect(accessToken).toBeTruthy();

    await request(app.getHttpServer())
      .get('/tasks/999999999999999')
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(404);
  });

  it('rejects an access token presented as a refresh token (401)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: userName, password: PASSWORD })
      .expect(200);
    const { accessToken } = login.body as { accessToken: string };

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: accessToken })
      .expect(401);
  });

  it('rejects an invalid refresh token (401)', () => {
    return request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' })
      .expect(401);
  });

  it('rejects an expired access token on a protected route (401)', () => {
    // Forge a token that expired one hour ago, signed with the app's secret.
    const expired = sign(
      { sub: userId, role: 'USER', purpose: 'access' },
      SECRET,
      { expiresIn: -3600 },
    );

    return request(app.getHttpServer())
      .get('/tasks/999999999999999')
      .set({ Authorization: `Bearer ${expired}` })
      .expect(401);
  });

  it('rejects a tampered access token on a protected route (401)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ name: userName, password: PASSWORD })
      .expect(200);
    const { accessToken } = login.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/tasks/999999999999999')
      .set({ Authorization: `Bearer ${accessToken}corrupted` })
      .expect(401);
  });
});
