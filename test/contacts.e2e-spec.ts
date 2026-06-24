import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * End-to-end tests for the contacts read/edit endpoints against the REAL
 * (disposable) dev DB. Exercises the full stack: HTTP -> JWT guard ->
 * ValidationPipe -> use case -> Prisma -> Postgres. A user authenticates via
 * POST /auth/login and sends a Bearer token. Every row created is cleaned up.
 *
 * Uses a distinct filename and a unique per-run suffix so it never collides
 * with other agents' e2e specs sharing the same database.
 */
const RUN = Date.now();

describe('Contacts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userToken: string;
  const createdUserIds: string[] = [];
  const createdContactIds: bigint[] = [];

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

  const createContact = async (body: {
    contactName: string;
    email?: string;
    birth?: string;
  }): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/contacts')
      .set(bearer(userToken))
      .send(body)
      .expect(201);
    const id = (res.body as { id: string }).id;
    createdContactIds.push(BigInt(id));
    return id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await createUser(`E2E Contacts User ${RUN}`, 'USER');
    userToken = await login(`E2E Contacts User ${RUN}`);
  });

  afterAll(async () => {
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
    await app.close();
  });

  describe('reading contacts', () => {
    it('lists contacts, including ones just created', async () => {
      const id = await createContact({
        contactName: `E2E List ${RUN}`,
        email: 'list@example.com',
      });

      const res = await request(app.getHttpServer())
        .get('/contacts')
        .set(bearer(userToken))
        .expect(200);

      const list = res.body as Array<{ id: string; contactName: string }>;
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((c) => c.id === id)).toBe(true);
    });

    it('views a single contact by id', async () => {
      const id = await createContact({
        contactName: `E2E View ${RUN}`,
        email: 'view@example.com',
        birth: '1990-05-17',
      });

      await request(app.getHttpServer())
        .get(`/contacts/${id}`)
        .set(bearer(userToken))
        .expect(200)
        .expect({
          id,
          contactName: `E2E View ${RUN}`,
          email: 'view@example.com',
          birth: '1990-05-17',
        });
    });

    it('returns 404 for a contact that does not exist', () => {
      return request(app.getHttpServer())
        .get('/contacts/999999999999999')
        .set(bearer(userToken))
        .expect(404);
    });
  });

  describe('editing a contact', () => {
    it('applies a partial edit and reflects it on read', async () => {
      const id = await createContact({
        contactName: `E2E Edit ${RUN}`,
        email: 'before@example.com',
        birth: '1980-01-01',
      });

      await request(app.getHttpServer())
        .patch(`/contacts/${id}`)
        .set(bearer(userToken))
        .send({ email: 'after@example.com' })
        .expect(200)
        .expect({
          id,
          contactName: `E2E Edit ${RUN}`,
          email: 'after@example.com',
          birth: '1980-01-01',
        });

      await request(app.getHttpServer())
        .get(`/contacts/${id}`)
        .set(bearer(userToken))
        .expect(200)
        .expect({
          id,
          contactName: `E2E Edit ${RUN}`,
          email: 'after@example.com',
          birth: '1980-01-01',
        });
    });

    it('rejects an invalid email (400)', async () => {
      const id = await createContact({ contactName: `E2E Invalid ${RUN}` });

      await request(app.getHttpServer())
        .patch(`/contacts/${id}`)
        .set(bearer(userToken))
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 404 when editing a contact that does not exist', () => {
      return request(app.getHttpServer())
        .patch('/contacts/999999999999999')
        .set(bearer(userToken))
        .send({ contactName: 'Nobody' })
        .expect(404);
    });
  });
});
