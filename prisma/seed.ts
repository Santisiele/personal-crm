import 'dotenv/config';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const scryptAsync = promisify(scrypt);

/**
 * Idempotent seed for the lookup / status tables.
 *
 * For each table we upsert by `description`: a row is only created when no row
 * with that exact description already exists (these tables have no unique
 * constraint on `description`, so we use findFirst + create). Existing rows are
 * NEVER deleted or renamed — other data and tests reference them by id.
 *
 * Only the 6 lookup tables are touched. App data (users, tasks, companies,
 * contacts) is left untouched.
 *
 * NOTE: the `description` values below are TECHNICAL KEYS matched on by the
 * application code and MUST stay in English. The only exception is
 * `company_status`, which is free-form business data seeded in Spanish.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Lookup = {
  name: string;
  findFirst: (args: { where: { description: string } }) => Promise<unknown>;
  create: (args: { data: { description: string } }) => Promise<unknown>;
  count: () => Promise<number>;
  values: string[];
};

/**
 * Hashes a password in the exact format ScryptPasswordHasher produces
 * ("<saltHex>:<derivedKeyHex>", 16-byte salt, 64-byte key), so the bootstrap
 * user can log in through the normal auth path. Re-implemented here rather than
 * imported so the seed stays free of the app's `@/` path aliases.
 */
async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/**
 * Bootstraps a single CREATOR so a fresh system has someone who can grant roles
 * (registration only ever mints a plain USER). Idempotent: it does nothing if a
 * user with that name already exists, and never overwrites. Name and password
 * come from BOOTSTRAP_CREATOR_NAME / BOOTSTRAP_CREATOR_PASSWORD, with dev
 * defaults — change the password in any real environment.
 */
async function seedBootstrapCreator(): Promise<void> {
  const name = process.env.BOOTSTRAP_CREATOR_NAME ?? 'creator';
  const password = process.env.BOOTSTRAP_CREATOR_PASSWORD ?? 'change-me-please';

  const existing = await prisma.app_user.findFirst({ where: { name } });
  if (existing) {
    console.log(`bootstrap creator: '${name}' already exists (skipped)`);
    return;
  }

  const role = await prisma.user_role.findFirst({
    where: { description: 'CREATOR' },
  });
  if (!role) {
    throw new Error('No CREATOR role found; seed the lookup tables first');
  }

  await prisma.app_user.create({
    data: {
      name,
      user_password_hash: await hashPassword(password),
      user_role_id: role.id,
    },
  });
  console.log(`bootstrap creator: created '${name}'`);
}

async function seedTable(table: Lookup): Promise<void> {
  let created = 0;
  for (const description of table.values) {
    const existing = await table.findFirst({ where: { description } });
    if (!existing) {
      await table.create({ data: { description } });
      created += 1;
    }
  }
  const present = await table.count();
  console.log(
    `${table.name}: +${created} / ${table.values.length} requested (${present} rows present)`,
  );
}

async function main(): Promise<void> {
  const tables: Lookup[] = [
    {
      name: 'user_role',
      findFirst: (a) => prisma.user_role.findFirst(a),
      create: (a) => prisma.user_role.create(a),
      count: () => prisma.user_role.count(),
      values: ['USER', 'ADMIN', 'CREATOR'],
    },
    {
      name: 'task_status',
      findFirst: (a) => prisma.task_status.findFirst(a),
      create: (a) => prisma.task_status.create(a),
      count: () => prisma.task_status.count(),
      values: ['PENDING', 'IN_PROGRESS', 'DONE'],
    },
    {
      name: 'assignment_status',
      findFirst: (a) => prisma.assignment_status.findFirst(a),
      create: (a) => prisma.assignment_status.create(a),
      count: () => prisma.assignment_status.count(),
      values: ['PENDING', 'ACCEPTED', 'REJECTED'],
    },
    {
      name: 'activity_status',
      findFirst: (a) => prisma.activity_status.findFirst(a),
      create: (a) => prisma.activity_status.create(a),
      count: () => prisma.activity_status.count(),
      values: ['DONE', 'DELETED'],
    },
    {
      name: 'action_type',
      findFirst: (a) => prisma.action_type.findFirst(a),
      create: (a) => prisma.action_type.create(a),
      count: () => prisma.action_type.count(),
      values: ['CALL', 'MEETING', 'EMAIL', 'NOTE', 'ARCHIVE'],
    },
    {
      name: 'company_status',
      findFirst: (a) => prisma.company_status.findFirst(a),
      create: (a) => prisma.company_status.create(a),
      count: () => prisma.company_status.count(),
      // Free-form business data — intentionally Spanish.
      values: ['Prospecto', 'Contactado', 'Negociación', 'Cliente', 'Inactivo'],
    },
  ];

  console.log('Seeding lookup tables...');
  for (const table of tables) {
    await seedTable(table);
  }
  // Depends on the user_role rows above, so it runs after the lookup seed.
  await seedBootstrapCreator();
  console.log('Seed complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
