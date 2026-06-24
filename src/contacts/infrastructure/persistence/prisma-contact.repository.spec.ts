import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Contact } from '@/contacts/domain/contact';
import { PrismaContactRepository } from '@/contacts/infrastructure/persistence/prisma-contact.repository';

/**
 * Integration test for the Prisma adapter. It is OPT-IN: it only runs when
 * TEST_DATABASE_URL is set, and that URL must point at a DISPOSABLE database
 * (never the production/Supabase one) because it writes and deletes rows.
 *
 * Run with, e.g.:
 *   TEST_DATABASE_URL="postgresql://...localhost.../test" pnpm test
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb('PrismaContactRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaContactRepository;

  const createdIds: bigint[] = [];

  beforeAll(() => {
    const adapter = new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaContactRepository(prisma);
  });

  afterAll(async () => {
    await prisma.contact.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('creates a contact and reads its fields back', async () => {
    const contact = Contact.create({
      contactName: 'Jane Doe',
      email: 'jane@example.com',
      birth: '1990-05-17',
    });
    await repository.save(contact);
    expect(contact.id).not.toBeNull();
    createdIds.push(BigInt(contact.id!));

    const reloaded = await repository.findById(contact.id!);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.contactName).toBe('Jane Doe');
    expect(reloaded!.email).toBe('jane@example.com');
    expect(reloaded!.birth).toBe('1990-05-17');
  });

  it('creates a contact with no email nor birth and reads back nulls', async () => {
    const contact = Contact.create({ contactName: 'John Roe' });
    await repository.save(contact);
    expect(contact.id).not.toBeNull();
    createdIds.push(BigInt(contact.id!));

    const reloaded = await repository.findById(contact.id!);
    expect(reloaded!.contactName).toBe('John Roe');
    expect(reloaded!.email).toBeNull();
    expect(reloaded!.birth).toBeNull();
  });
});
