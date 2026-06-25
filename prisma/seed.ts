import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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
