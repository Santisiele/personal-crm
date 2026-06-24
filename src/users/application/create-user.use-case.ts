import { PasswordHasher } from '@/users/domain/password-hasher';
import { User } from '@/users/domain/user';
import { UserNameTakenError } from '@/users/domain/user-name-taken.error';
import { UserRole } from '@/users/domain/user-role';
import { UserRepository } from '@/users/domain/user.repository';

export interface CreateUserCommand {
  name: string;
  role: UserRole;
  password: string;
}

/**
 * Application service orchestrating user creation. Depends only on domain ports
 * (Dependency Inversion), so it is agnostic to persistence and hashing
 * strategies. Identity is assigned by the repository on save.
 */
export class CreateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    if (await this.users.findByName(command.name)) {
      throw new UserNameTakenError(command.name);
    }
    const user = User.create({
      name: command.name,
      role: command.role,
      passwordHash: await this.hasher.hash(command.password),
    });
    await this.users.save(user);
    return user;
  }
}
