import { PrismaClient } from '@prisma/client';
import { Role } from '@/users/domain/role';
import { RoleRepository } from '@/users/domain/role.repository';

/**
 * Prisma-backed driven adapter implementing the RoleRepository port. Reads and
 * writes the `user_role` lookup table owned by the users context.
 *
 * Translates between the domain model (string id) and the relational schema
 * (BigInt autoincrement id), mirroring the BigInt handling in the other Prisma
 * adapters.
 */
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(role: Role): Promise<void> {
    const created = await this.prisma.user_role.create({
      data: { description: role.description },
    });
    role.assignId(created.id.toString());
  }

  async findAll(): Promise<Role[]> {
    const rows = await this.prisma.user_role.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map((row) =>
      Role.rehydrate({ id: row.id.toString(), description: row.description }),
    );
  }

  async findByDescription(description: string): Promise<Role | null> {
    const row = await this.prisma.user_role.findFirst({
      where: { description },
    });
    if (!row) {
      return null;
    }
    return Role.rehydrate({
      id: row.id.toString(),
      description: row.description,
    });
  }
}
