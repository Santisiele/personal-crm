import { IdGenerator } from '../domain/id-generator';
import { User } from '../domain/user';
import { UserRole } from '../domain/user-role';
import { UserRepository } from '../domain/user.repository';

export interface CreateUserCommand {
  name: string;
  role: UserRole;
}

/**
 * Application service orchestrating user creation. Depends only on domain ports
 * (Dependency Inversion), so it is agnostic to persistence and id strategy.
 */
export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const user = User.create({
      id: this.ids.next(),
      name: command.name,
      role: command.role,
    });
    await this.users.save(user);
    return user;
  }
}
