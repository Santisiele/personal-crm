import { User, UserId } from '@/users/domain/user';
import { UserRepository } from '@/users/domain/user.repository';

/**
 * In-memory driven adapter. Used as a fast, dependency-free substitute for the
 * real persistence adapter in acceptance/unit tests and local development.
 *
 * Owns identity for new users via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<UserId, User>();
  private sequence = 0;

  save(user: User): Promise<void> {
    if (user.id === null) {
      this.sequence += 1;
      user.assignId(String(this.sequence));
    }
    this.users.set(user.id as UserId, user);
    return Promise.resolve();
  }

  findById(id: UserId): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }
}
