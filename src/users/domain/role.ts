export type RoleId = string;

/**
 * Role aggregate: a role definition row in the `user_role` table, identified by
 * a technical English `description` key (e.g. 'USER', 'ADMIN', 'CREATOR') that
 * the rest of the codebase matches on. Display labels (e.g. Spanish) are a
 * frontend i18n concern and are kept out of the domain.
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created role has a null id until
 * saved — mirroring the other aggregates.
 */
export class Role {
  private constructor(
    private _id: RoleId | null,
    public readonly description: string,
  ) {}

  /** A brand-new role that has not been persisted yet (no identity). */
  static create(props: { description: string }): Role {
    return new Role(null, props.description);
  }

  /** Reconstitutes an already-persisted role from a repository. */
  static rehydrate(props: { id: RoleId; description: string }): Role {
    return new Role(props.id, props.description);
  }

  get id(): RoleId | null {
    return this._id;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: RoleId): void {
    if (this._id !== null) {
      throw new Error('Role already has an identity');
    }
    this._id = id;
  }
}
