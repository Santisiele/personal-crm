import { User, UserId } from '@/users/domain/user';

/**
 * Driven port: the application depends on this abstraction, never on a concrete
 * persistence technology. Adapters (in-memory, Prisma, ...) implement it.
 */
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
