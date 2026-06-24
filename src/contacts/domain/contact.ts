export type ContactId = string;

/**
 * Contact aggregate root. Holds its own data; persistence and transport are kept
 * outside the domain via ports (hexagonal architecture).
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created contact has a null id
 * until saved — mirroring the User aggregate.
 *
 * `birth` is modelled as an ISO calendar date string ('YYYY-MM-DD'), independent
 * of any time zone, because the column is a plain DATE.
 *
 * Mutable attributes are private with getters (as in the User aggregate); edits
 * go through the `update` behaviour so the aggregate stays in control of its own
 * state.
 */
export class Contact {
  private constructor(
    private _id: ContactId | null,
    private _contactName: string,
    private _email: string | null,
    private _birth: string | null,
  ) {}

  /** A brand-new contact that has not been persisted yet (no identity). */
  static create(props: {
    contactName: string;
    email?: string | null;
    birth?: string | null;
  }): Contact {
    return new Contact(
      null,
      props.contactName,
      props.email ?? null,
      props.birth ?? null,
    );
  }

  /** Reconstitutes an already-persisted contact from a repository. */
  static rehydrate(props: {
    id: ContactId;
    contactName: string;
    email?: string | null;
    birth?: string | null;
  }): Contact {
    return new Contact(
      props.id,
      props.contactName,
      props.email ?? null,
      props.birth ?? null,
    );
  }

  get id(): ContactId | null {
    return this._id;
  }

  get contactName(): string {
    return this._contactName;
  }

  get email(): string | null {
    return this._email;
  }

  get birth(): string | null {
    return this._birth;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: ContactId): void {
    if (this._id !== null) {
      throw new Error('Contact already has an identity');
    }
    this._id = id;
  }

  /**
   * Applies a partial edit. Only the provided attributes change; an omitted
   * (undefined) attribute is left untouched, while an explicit null clears the
   * optional fields. The contact name cannot be cleared.
   */
  update(changes: {
    contactName?: string;
    email?: string | null;
    birth?: string | null;
  }): void {
    if (changes.contactName !== undefined) {
      this._contactName = changes.contactName;
    }
    if (changes.email !== undefined) {
      this._email = changes.email;
    }
    if (changes.birth !== undefined) {
      this._birth = changes.birth;
    }
  }
}
