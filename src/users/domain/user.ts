import { UserRole } from './user-role';

export type UserId = string;

/**
 * User aggregate root. Holds its own invariants; persistence and transport are
 * kept outside the domain via ports (hexagonal architecture).
 */
export class User {
  private constructor(
    public readonly id: UserId,
    public readonly name: string,
    public readonly role: UserRole,
  ) {}

  static create(props: { id: UserId; name: string; role: UserRole }): User {
    return new User(props.id, props.name, props.role);
  }
}
