import { User, UserId } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';

/**
 * In-memory driven adapter. Used as a fast, dependency-free substitute for the
 * real persistence adapter in acceptance/unit tests and local development.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<UserId, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
