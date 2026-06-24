import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Company } from '@/companies/domain/company';
import { PrismaCompanyRepository } from '@/companies/infrastructure/persistence/prisma-company.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaCompanyRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaCompanyRepository;

  let userRoleId: bigint;
  let ownerId: bigint;
  let companyStatusId: bigint;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaCompanyRepository(prisma);

    // The schema is heavily normalized; create the lookup/FK rows the adapter
    // and the company row depend on.
    const role = await prisma.user_role.create({
      data: { description: 'IT-COMPANY-ROLE' },
    });
    userRoleId = role.id;

    const owner = await prisma.app_user.create({
      data: {
        name: 'Company Owner',
        user_password_hash: 'hashed:x',
        user_role_id: userRoleId,
      },
    });
    ownerId = owner.id;

    const companyStatus = await prisma.company_status.create({
      data: { description: 'IT-COMPANY-STATUS' },
    });
    companyStatusId = companyStatus.id;
  });

  afterAll(async () => {
    // The tests insert companies owned by `ownerId`; clean them all up
    // regardless of their generated ids.
    await prisma.company.deleteMany({ where: { created_by: ownerId } });
    await prisma.app_user.deleteMany({ where: { id: ownerId } });
    await prisma.company_status.deleteMany({ where: { id: companyStatusId } });
    await prisma.user_role.deleteMany({ where: { id: userRoleId } });
    await prisma.$disconnect();
  });

  it('creates a company and reads back the owner and attributes', async () => {
    const company = Company.create({
      ownerId: ownerId.toString(),
      companyName: 'Integration Co',
      cuit: '20-12345678-9',
      brand: 'IntegrationBrand',
      product: 'IntegrationProduct',
      origin: 'Argentina',
    });
    await repository.save(company);

    expect(company.id).not.toBeNull();
    const reloaded = await repository.findById(company.id!);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.ownerId).toBe(ownerId.toString());
    expect(reloaded!.companyName).toBe('Integration Co');
    expect(reloaded!.cuit).toBe('20-12345678-9');
    expect(reloaded!.brand).toBe('IntegrationBrand');
    expect(reloaded!.product).toBe('IntegrationProduct');
    expect(reloaded!.origin).toBe('Argentina');
  });

  it('creates a company with no optional attributes and reads back nulls', async () => {
    const company = Company.create({
      ownerId: ownerId.toString(),
      companyName: 'Minimal Co',
    });
    await repository.save(company);

    const reloaded = await repository.findById(company.id!);
    expect(reloaded!.companyName).toBe('Minimal Co');
    expect(reloaded!.cuit).toBeNull();
    expect(reloaded!.brand).toBeNull();
    expect(reloaded!.product).toBeNull();
    expect(reloaded!.origin).toBeNull();
  });
});
