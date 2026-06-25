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
  // Ids of users that have been logically deleted (deactivated). They stay in
  // `users` so findById can still resolve them, but are hidden from listing and
  // login lookups, mirroring the `deleted_at` column in the database.
  private readonly deactivated = new Set<UserId>();
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

  findByName(name: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.name === name && !this.deactivated.has(user.id as UserId)) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  findAll(): Promise<User[]> {
    return Promise.resolve(
      Array.from(this.users.values()).filter(
        (user) => !this.deactivated.has(user.id as UserId),
      ),
    );
  }

  softDelete(id: UserId): Promise<void> {
    this.deactivated.add(id);
    return Promise.resolve();
  }
}
