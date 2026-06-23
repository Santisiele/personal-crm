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
    private _role: UserRole,
    private _passwordHash: string,
  ) {}

  static create(props: {
    id: UserId;
    name: string;
    role: UserRole;
    passwordHash: string;
  }): User {
    return new User(props.id, props.name, props.role, props.passwordHash);
  }

  get role(): UserRole {
    return this._role;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  changePassword(newPasswordHash: string): void {
    this._passwordHash = newPasswordHash;
  }

  changeRole(newRole: UserRole): void {
    this._role = newRole;
  }
}
