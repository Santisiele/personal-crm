import { IdGenerator } from '../domain/id-generator';
import { PasswordHasher } from '../domain/password-hasher';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role';
import { UserRepository } from '../domain/user.repository';

export interface CreateUserCommand {
  name: string;
  role: UserRole;
  password: string;
}

/**
 * Application service orchestrating user creation. Depends only on domain ports
 * (Dependency Inversion), so it is agnostic to persistence, id and hashing
 * strategies.
 */
export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const user = User.create({
      id: this.ids.next(),
      name: command.name,
      role: command.role,
      passwordHash: await this.hasher.hash(command.password),
    });
    await this.users.save(user);
    return user;
  }
}
