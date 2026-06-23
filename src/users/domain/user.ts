import { UserRole } from '@/users/domain/user-role';

export type UserId = string;

/**
 * User aggregate root. Holds its own invariants; persistence and transport are
 * kept outside the domain via ports (hexagonal architecture).
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created user has a null id until
 * saved.
 */
export class User {
  private constructor(
    private _id: UserId | null,
    public readonly name: string,
    private _role: UserRole,
    private _passwordHash: string,
  ) {}

  /** A brand-new user that has not been persisted yet (no identity). */
  static create(props: {
    name: string;
    role: UserRole;
    passwordHash: string;
  }): User {
    return new User(null, props.name, props.role, props.passwordHash);
  }

  /** Reconstitutes an already-persisted user from a repository. */
  static rehydrate(props: {
    id: UserId;
    name: string;
    role: UserRole;
    passwordHash: string;
  }): User {
    return new User(props.id, props.name, props.role, props.passwordHash);
  }

  get id(): UserId | null {
    return this._id;
  }

  get role(): UserRole {
    return this._role;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: UserId): void {
    if (this._id !== null) {
      throw new Error('User already has an identity');
    }
    this._id = id;
  }

  changePassword(newPasswordHash: string): void {
    this._passwordHash = newPasswordHash;
  }

  changeRole(newRole: UserRole): void {
    this._role = newRole;
  }
}
