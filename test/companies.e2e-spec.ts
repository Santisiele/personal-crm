import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * End-to-end tests for the companies read/edit/status flows against the REAL
 * database (the disposable Supabase dev DB). They exercise the full stack: HTTP →
 * JWT guard → ValidationPipe → @CurrentActor → use case → Prisma → Postgres.
 * Every row created is cleaned up. A distinct filename avoids colliding with the
 * other agents' e2e suites that share this DB.
 */
const RUN = Date.now();

describe('Companies (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;

  // Lookup rows we may have to seed and the company_status descriptions we use.
  let seededCompanyStatusId: bigint | null = null;
  let seededActiveStatusId: bigint | null = null;
  let seededArchivedStatusId: bigint | null = null;
  const createdCompanyIds: bigint[] = [];
  const createdContactIds: bigint[] = [];
  const createdUserIds: string[] = [];

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

  const createCompany = async (companyName: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/companies')
      .set(bearer(adminToken))
      .send({ companyName })
      .expect(201);
    const body = res.body as { id: string };
    createdCompanyIds.push(BigInt(body.id));
    return body.id;
  };

  const createContact = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/contacts')
      .set(bearer(adminToken))
      .send({ contactName: 'E2E Linked Contact' })
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

    // Creating a company needs at least one company_status (lowest id is the
    // default). Status transitions resolve a status by description, so make sure
    // the two we transition to exist.
    if (!(await prisma.company_status.findFirst())) {
      const status = await prisma.company_status.create({
        data: { description: 'E2E-CO-DEFAULT' },
      });
      seededCompanyStatusId = status.id;
    }
    if (
      !(await prisma.company_status.findFirst({
        where: { description: 'ACTIVE' },
      }))
    ) {
      const status = await prisma.company_status.create({
        data: { description: 'ACTIVE' },
      });
      seededActiveStatusId = status.id;
    }
    if (
      !(await prisma.company_status.findFirst({
        where: { description: 'ARCHIVED' },
      }))
    ) {
      const status = await prisma.company_status.create({
        data: { description: 'ARCHIVED' },
      });
      seededArchivedStatusId = status.id;
    }

    await createUser(`E2E Co Admin ${RUN}`, 'ADMIN');
    await createUser(`E2E Co User ${RUN}`, 'USER');
    adminToken = await login(`E2E Co Admin ${RUN}`);
    userToken = await login(`E2E Co User ${RUN}`);
  });

  afterAll(async () => {
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
    if (seededActiveStatusId) {
      await prisma.company_status.deleteMany({
        where: { id: seededActiveStatusId },
      });
    }
    if (seededArchivedStatusId) {
      await prisma.company_status.deleteMany({
        where: { id: seededArchivedStatusId },
      });
    }
    if (seededCompanyStatusId) {
      await prisma.company_status.deleteMany({
        where: { id: seededCompanyStatusId },
      });
    }
    await app.close();
  });

  describe('listing companies', () => {
    it('returns the created companies', async () => {
      const id = await createCompany(`E2E List Co ${RUN}`);

      const res = await request(app.getHttpServer())
        .get('/companies')
        .set(bearer(userToken))
        .expect(200);

      const list = res.body as Array<{ id: string }>;
      expect(list.some((c) => c.id === id)).toBe(true);
    });
  });

  describe('viewing a company with its contacts', () => {
    it('hydrates the linked contacts', async () => {
      const companyId = await createCompany(`E2E View Co ${RUN}`);
      const contactId = await createContact();

      await request(app.getHttpServer())
        .post(`/companies/${companyId}/contacts`)
        .set(bearer(adminToken))
        .send({ contactId, roleInCompany: 'CTO', phone: '555-0199' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set(bearer(userToken))
        .expect(200);

      const body = res.body as {
        id: string;
        contacts: Array<{ id: string; roleInCompany: string; phone: string }>;
      };
      expect(body.id).toBe(companyId);
      expect(body.contacts).toHaveLength(1);
      expect(body.contacts[0].id).toBe(contactId);
      expect(body.contacts[0].roleInCompany).toBe('CTO');
      expect(body.contacts[0].phone).toBe('555-0199');
    });

    it('returns 404 for a company that does not exist', () => {
      return request(app.getHttpServer())
        .get('/companies/999999999999999')
        .set(bearer(userToken))
        .expect(404);
    });
  });

  describe('editing a company', () => {
    it('lets an admin edit the company fields', async () => {
      const companyId = await createCompany(`E2E Edit Co ${RUN}`);

      const res = await request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set(bearer(adminToken))
        .send({ companyName: `E2E Renamed ${RUN}`, brand: 'NewBrand' })
        .expect(200);

      const body = res.body as { companyName: string; brand: string };
      expect(body.companyName).toBe(`E2E Renamed ${RUN}`);
      expect(body.brand).toBe('NewBrand');
    });

    it('forbids a normal user from editing (403)', async () => {
      const companyId = await createCompany(`E2E Edit Denied ${RUN}`);

      await request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set(bearer(userToken))
        .send({ companyName: 'Denied' })
        .expect(403);
    });

    it('returns 404 when editing a company that does not exist', () => {
      return request(app.getHttpServer())
        .patch('/companies/999999999999999')
        .set(bearer(adminToken))
        .send({ companyName: 'Nope' })
        .expect(404);
    });
  });

  describe('changing a company status', () => {
    it('lets an admin transition the status', async () => {
      const companyId = await createCompany(`E2E Status Co ${RUN}`);

      const res = await request(app.getHttpServer())
        .patch(`/companies/${companyId}/status`)
        .set(bearer(adminToken))
        .send({ status: 'ARCHIVED' })
        .expect(200);

      expect((res.body as { status: string }).status).toBe('ARCHIVED');

      const reread = await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set(bearer(adminToken))
        .expect(200);
      expect((reread.body as { status: string }).status).toBe('ARCHIVED');
    });

    it('forbids a normal user from changing the status (403)', async () => {
      const companyId = await createCompany(`E2E Status Denied ${RUN}`);

      await request(app.getHttpServer())
        .patch(`/companies/${companyId}/status`)
        .set(bearer(userToken))
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    it('returns 404 changing the status of a missing company', () => {
      return request(app.getHttpServer())
        .patch('/companies/999999999999999/status')
        .set(bearer(adminToken))
        .send({ status: 'ACTIVE' })
        .expect(404);
    });
  });

  describe('deleting a company', () => {
    it('lets an admin delete a company and drops it from the listing (204)', async () => {
      const companyId = await createCompany(`E2E Delete Co ${RUN}`);

      // It is present before the deletion.
      const before = await request(app.getHttpServer())
        .get('/companies')
        .set(bearer(adminToken))
        .expect(200);
      expect(
        (before.body as Array<{ id: string }>).some((c) => c.id === companyId),
      ).toBe(true);

      await request(app.getHttpServer())
        .delete(`/companies/${companyId}`)
        .set(bearer(adminToken))
        .expect(204);

      // The logical delete excludes it from the listing...
      const after = await request(app.getHttpServer())
        .get('/companies')
        .set(bearer(adminToken))
        .expect(200);
      expect(
        (after.body as Array<{ id: string }>).some((c) => c.id === companyId),
      ).toBe(false);

      // ...but it is still retrievable by id for historical references.
      const reread = await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set(bearer(adminToken))
        .expect(200);
      expect((reread.body as { id: string }).id).toBe(companyId);
    });

    it('forbids a normal user from deleting (403)', async () => {
      const companyId = await createCompany(`E2E Delete Denied ${RUN}`);

      await request(app.getHttpServer())
        .delete(`/companies/${companyId}`)
        .set(bearer(userToken))
        .expect(403);
    });
  });
});
