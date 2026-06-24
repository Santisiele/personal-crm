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
 */
export class Contact {
  private constructor(
    private _id: ContactId | null,
    public readonly contactName: string,
    public readonly email: string | null,
    public readonly birth: string | null,
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

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: ContactId): void {
    if (this._id !== null) {
      throw new Error('Contact already has an identity');
    }
    this._id = id;
  }
}
