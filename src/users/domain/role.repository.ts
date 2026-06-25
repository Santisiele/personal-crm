import { Role } from '@/users/domain/role';

/**
 * Driven port: the application depends on this abstraction, never on a concrete
 * persistence technology. Adapters (in-memory, Prisma, ...) implement it. Roles
 * live in the `user_role` lookup table owned by the users context.
 */
export interface RoleRepository {
  save(role: Role): Promise<void>;
  /** Lists every role definition, ordered by identity. */
  findAll(): Promise<Role[]>;
  /** Looks a role up by its technical description, for duplicate detection. */
  findByDescription(description: string): Promise<Role | null>;
}

export const ROLE_REPOSITORY = Symbol('RoleRepository');
