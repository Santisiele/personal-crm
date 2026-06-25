import { User, UserId } from '@/users/domain/user';

/**
 * Driven port: the application depends on this abstraction, never on a concrete
 * persistence technology. Adapters (in-memory, Prisma, ...) implement it.
 */
export interface UserRepository {
  save(user: User): Promise<void>;
  /** Returns the user by id, including those that have been deactivated, so
   * historical references (e.g. tasks a deactivated user created) stay
   * viewable. */
  findById(id: UserId): Promise<User | null>;
  /** Looks a user up by name for login, excluding deactivated users. */
  findByName(name: string): Promise<User | null>;
  /** Lists the active directory, excluding deactivated users. */
  findAll(): Promise<User[]>;
  /** Logically deletes (deactivates) a user, recording who did it. The row is
   * never physically removed. */
  softDelete(id: UserId, deletedBy: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
