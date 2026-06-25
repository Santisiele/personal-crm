import { PrismaClient } from '@prisma/client';
import { User, UserId } from '@/users/domain/user';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';

/**
 * Prisma-backed driven adapter implementing the UserRepository port.
 *
 * Translates between the domain model (string id, UserRole enum) and the
 * relational schema (BigInt autoincrement id, user_role lookup table). The role
 * is resolved against user_role rows by their `description`.
 */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const userRoleId = await this.resolveRoleId(user.role);

    if (user.id === null) {
      const created = await this.prisma.app_user.create({
        data: {
          name: user.name,
          user_password_hash: user.passwordHash,
          user_role_id: userRoleId,
        },
      });
      user.assignId(created.id.toString());
      return;
    }

    await this.prisma.app_user.update({
      where: { id: BigInt(user.id) },
      data: {
        name: user.name,
        user_password_hash: user.passwordHash,
        user_role_id: userRoleId,
      },
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.prisma.app_user.findUnique({
      where: { id: BigInt(id) },
      include: { user_role: true },
    });
    if (!row) {
      return null;
    }
    return User.rehydrate({
      id: row.id.toString(),
      name: row.name,
      role: this.toUserRole(row.user_role.description),
      passwordHash: row.user_password_hash,
    });
  }

  async findByName(name: string): Promise<User | null> {
    const row = await this.prisma.app_user.findFirst({
      where: { name, deleted_at: null },
      include: { user_role: true },
    });
    if (!row) {
      return null;
    }
    return User.rehydrate({
      id: row.id.toString(),
      name: row.name,
      role: this.toUserRole(row.user_role.description),
      passwordHash: row.user_password_hash,
    });
  }

  async findAll(): Promise<User[]> {
    const rows = await this.prisma.app_user.findMany({
      where: { deleted_at: null },
      include: { user_role: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) =>
      User.rehydrate({
        id: row.id.toString(),
        name: row.name,
        role: this.toUserRole(row.user_role.description),
        passwordHash: row.user_password_hash,
      }),
    );
  }

  async softDelete(id: UserId, deletedBy: string): Promise<void> {
    await this.prisma.app_user.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date(), deleted_by: BigInt(deletedBy) },
    });
  }

  private async resolveRoleId(role: UserRole): Promise<bigint> {
    const row = await this.prisma.user_role.findFirst({
      where: { description: role },
    });
    if (!row) {
      throw new Error(
        `Unknown user role '${role}': no matching user_role row found`,
      );
    }
    return row.id;
  }

  private toUserRole(description: string): UserRole {
    if (!(Object.values(UserRole) as string[]).includes(description)) {
      throw new Error(`Unrecognized user_role description '${description}'`);
    }
    return description as UserRole;
  }
}
