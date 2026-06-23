import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { User } from '../../domain/user';
import { UserRole } from '../../domain/user-role';
import { PrismaUserRepository } from './prisma-user.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaUserRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaUserRepository;
  const createdUserIds: bigint[] = [];

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaUserRepository(prisma);

    // The schema models roles as a lookup table; ensure the rows the adapter
    // resolves against exist.
    for (const role of Object.values(UserRole)) {
      const existing = await prisma.user_role.findFirst({
        where: { description: role },
      });
      if (!existing) {
        await prisma.user_role.create({ data: { description: role } });
      }
    }
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.app_user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await prisma.$disconnect();
  });

  it('assigns a database identity on save and reads the user back', async () => {
    const user = User.create({
      name: 'Integration Jane',
      role: UserRole.USER,
      passwordHash: 'hashed:secret',
    });

    await repository.save(user);
    expect(user.id).not.toBeNull();
    createdUserIds.push(BigInt(user.id!));

    const found = await repository.findById(user.id!);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Integration Jane');
    expect(found!.role).toBe(UserRole.USER);
    expect(found!.passwordHash).toBe('hashed:secret');
  });

  it('persists role and password changes', async () => {
    const user = User.create({
      name: 'Integration Bob',
      role: UserRole.USER,
      passwordHash: 'hashed:old',
    });
    await repository.save(user);
    createdUserIds.push(BigInt(user.id!));

    user.changeRole(UserRole.ADMIN);
    user.changePassword('hashed:new');
    await repository.save(user);

    const found = await repository.findById(user.id!);
    expect(found!.role).toBe(UserRole.ADMIN);
    expect(found!.passwordHash).toBe('hashed:new');
  });
});
