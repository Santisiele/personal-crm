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

  it('lists contacts, including ones it created', async () => {
    const contact = Contact.create({ contactName: 'Listed Contact' });
    await repository.save(contact);
    createdIds.push(BigInt(contact.id!));

    const all = await repository.findAll();
    expect(all.some((c) => c.id === contact.id)).toBe(true);
  });

  it('edits an existing contact in place and reads the change back', async () => {
    const contact = Contact.create({
      contactName: 'Before Edit',
      email: 'before@example.com',
      birth: '1980-01-01',
    });
    await repository.save(contact);
    createdIds.push(BigInt(contact.id!));

    contact.update({ contactName: 'After Edit', email: 'after@example.com' });
    await repository.save(contact);

    const reloaded = await repository.findById(contact.id!);
    expect(reloaded!.contactName).toBe('After Edit');
    expect(reloaded!.email).toBe('after@example.com');
    // Untouched field stays put.
    expect(reloaded!.birth).toBe('1980-01-01');
  });
});
